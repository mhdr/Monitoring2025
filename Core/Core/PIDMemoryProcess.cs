using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Core.Libs;
using Core.Models;
using Core.RedisModels;
using Microsoft.EntityFrameworkCore;

namespace Core;

public class PIDMemoryProcess
{
    // Singleton instance
    private static PIDMemoryProcess? _instance;
    private static readonly object _lock = new object();
    private static Task? _runTask;
    private List<PIDMemory> _memories = [];
    private long? _memoriesEpoch;
    private DataContext? _context;

    private List<PIDDto> _pids = [];

    // Private constructor to enforce Singleton
    private PIDMemoryProcess()
    {
        _context = null;
    }

    // Singleton instance access
    public static PIDMemoryProcess Instance
    {
        get
        {
            lock (_lock) // Ensure thread-safe access to the instance
            {
                if (_instance == null)
                {
                    _instance = new PIDMemoryProcess();
                }
            }

            return _instance;
        }
    }

    public async Task Run()
    {
        lock (_lock)
        {
            if (_runTask == null)
            {
                _runTask = Task.Run(async () =>
                {
                    // Wait for database to be ready at startup
                    await WaitForDatabaseConnection();
                    
                    while (true)
                    {
                        try
                        {
                            await using (_context = new DataContext())
                            {
                                await Process();
                            }
                        }
                        catch (Exception ex2)
                        {
                            MyLog.LogJson(ex2);
                        }
                        finally
                        {
                            await Task.Delay(1000); // Delay to prevent rapid loops
                        }
                    }
                });
            }
        }

        await _runTask; // Await the task if it has already started
    }

    private async Task WaitForDatabaseConnection()
    {
        int maxRetries = 30;
        int retryDelay = 2000; // 2 seconds

        for (int i = 0; i < maxRetries; i++)
        {
            try
            {
                using var testContext = new DataContext();
                await testContext.Database.CanConnectAsync();
                MyLog.LogJson("PIDMemoryProcess", "Database connection established");
                return;
            }
            catch (Exception ex)
            {
                MyLog.LogJson("PIDMemoryProcess", $"Waiting for database connection... Attempt {i + 1}/{maxRetries}");
                if (i == maxRetries - 1)
                {
                    MyLog.LogJson(ex);
                    throw;
                }
                await Task.Delay(retryDelay);
            }
        }
    }

    private async Task FetchPidMemories()
    {
        DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
        long epochTime = currentTimeUtc.ToUnixTimeSeconds();

        if (!_memoriesEpoch.HasValue)
        {
            _memories = await _context!.PIDMemories.ToListAsync();
            _memoriesEpoch = epochTime;
        }
        else
        {
            if (epochTime - _memoriesEpoch.Value > 60)
            {
                _memories = await _context!.PIDMemories.ToListAsync();
                _memoriesEpoch = epochTime;
            }
        }
    }

    public async Task Process()
    {
        await FetchPidMemories();

        // Group PIDs by cascade level for ordered execution
        // Level 0 (standalone/outer) execute first, then level 1, then level 2
        var pidsByLevel = _memories
            .Where(m => !m.IsDisabled)
            .GroupBy(m => m.CascadeLevel)
            .OrderBy(g => g.Key)
            .ToList();

        // Execute each cascade level sequentially to ensure proper dependency order
        foreach (var levelGroup in pidsByLevel)
        {
            // Batch fetch all Redis items for this cascade level (5-10× performance improvement)
            var finalItemIds = new HashSet<string>();
            var rawItemIds = new HashSet<string>();
            
            foreach (var memory in levelGroup)
            {
                // Collect all required item IDs for batch read
                finalItemIds.Add(memory.InputItemId.ToString());
                rawItemIds.Add(memory.OutputItemId.ToString());
                
                finalItemIds.Add(memory.SetPointId.ToString());
                finalItemIds.Add(memory.IsAutoId.ToString());
                finalItemIds.Add(memory.ManualValueId.ToString());
                finalItemIds.Add(memory.ReverseOutputId.ToString());
            }
            
            // Single batch read for all final items at this cascade level
            var finalItemsCache = await Points.GetFinalItemsBatch(finalItemIds.ToList());
            
            // Single batch read for all raw items at this cascade level
            var rawItemsCache = await Points.GetRawItemsBatch(rawItemIds.ToList());
            
            MyLog.Debug("Batch fetched Redis items for PID cascade level", new Dictionary<string, object?>
            {
                ["CascadeLevel"] = levelGroup.Key,
                ["PIDCount"] = levelGroup.Count(),
                ["FinalItemsRequested"] = finalItemIds.Count,
                ["FinalItemsFetched"] = finalItemsCache.Count,
                ["RawItemsRequested"] = rawItemIds.Count,
                ["RawItemsFetched"] = rawItemsCache.Count
            });

            // Within each level, PIDs can execute in parallel (they don't depend on each other)
            var tasks = levelGroup
                .Select(memory => ProcessSinglePID(memory, finalItemsCache, rawItemsCache))
                .ToList();

            // Wait for all PIDs at this level to complete before moving to next level
            await Task.WhenAll(tasks);
            
            // Small delay to allow Redis writes to propagate before next level reads them
            if (levelGroup.Key < MaxCascadeDepth)
            {
                await Task.Delay(50); // 50ms propagation delay between cascade levels
            }
        }
    }

    private const int MaxCascadeDepth = 2;

    /// <summary>
    /// Process a single PID controller with full error isolation
    /// Uses pre-fetched Redis items from batch read for optimal performance
    /// </summary>
    private async Task ProcessSinglePID(PIDMemory memory, 
        Dictionary<string, FinalItemRedis> finalItemsCache, 
        Dictionary<string, RawItemRedis> rawItemsCache)
    {
        try
        {
            // Skip if PID is undergoing auto-tuning (PIDTuningProcess controls output during tuning)
            if (await Points.IsPIDTuningActive(memory.Id))
            {
                MyLog.Debug($"Skipping PID {memory.Id} - auto-tuning in progress");
                return;
            }

            // Use cached batch-fetched items instead of individual Redis calls
            finalItemsCache.TryGetValue(memory.InputItemId.ToString(), out var input);
            rawItemsCache.TryGetValue(memory.OutputItemId.ToString(), out var output);

            if (input == null)
            {
                return;
            }

            // SetPoint - always from dynamic item
            finalItemsCache.TryGetValue(memory.SetPointId.ToString(), out var setPointItem);
            
            if (setPointItem == null)
            {
                MyLog.Warning($"SetPoint item not found for PID {memory.Id}");
                return;
            }
            
            double setPoint = double.Parse(setPointItem.Value);

            // IsAuto - always from dynamic item
            finalItemsCache.TryGetValue(memory.IsAutoId.ToString(), out var isAutoItem);
            
            if (isAutoItem == null)
            {
                MyLog.Warning($"IsAuto item not found for PID {memory.Id}");
                return;
            }
            
            bool isAuto = isAutoItem.Value == "1";

            // ManualValue - always from dynamic item
            finalItemsCache.TryGetValue(memory.ManualValueId.ToString(), out var manualValueItem);
            
            if (manualValueItem == null)
            {
                MyLog.Warning($"ManualValue item not found for PID {memory.Id}");
                return;
            }
            
            double manualValue = double.Parse(manualValueItem.Value);
            
            // ReverseOutput - always from dynamic item
            finalItemsCache.TryGetValue(memory.ReverseOutputId.ToString(), out var reverseOutputItem);
            
            if (reverseOutputItem == null)
            {
                MyLog.Warning($"ReverseOutput item not found for PID {memory.Id}");
                return;
            }
            
            bool reverseOutput = reverseOutputItem.Value == "1";

            double processVariable = Convert.ToDouble(input.Value);

            if (output == null)
            {
                // just create a new raw item and continue

                output = new RawItemRedis()
                {
                    ItemId = memory.OutputItemId,
                };

                // addFlag = true;
            }

            DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
            long epochTime = currentTimeUtc.ToUnixTimeSeconds();

            double deltaTime = 0;
            
            // Thread-safe access to shared _pids collection
            PIDDto? matched;
            lock (_lock)
            {
                matched = _pids.FirstOrDefault(x => x.Id == memory.Id);
            }

            if (matched == null)
            {
                matched = new PIDDto()
                {
                    Id = memory.Id,
                    Timestamp = epochTime,
                    PidController = new PIDController(memory.Kp, memory.Ki, memory.Kd, memory.OutputMin,
                        memory.OutputMax, reverseOutput)
                    {
                        DerivativeFilterAlpha = memory.DerivativeFilterAlpha,
                        MaxOutputSlewRate = memory.MaxOutputSlewRate,
                        DeadZone = memory.DeadZone,
                        FeedForward = memory.FeedForward,
                    },
                };

                // Attempt to restore state from Redis
                var configHash = GenerateConfigurationHash(memory, reverseOutput);
                var stateRestored = await LoadPIDState(memory, matched, configHash);
                
                if (!stateRestored)
                {
                    // No saved state or config changed - initialize for bumpless transfer
                    if (output != null && !string.IsNullOrEmpty(output.Value))
                    {
                        matched.PidController.InitializeForBumplessTransfer(
                            Convert.ToDouble(output.Value),
                            processVariable, 
                            setPoint
                        );
                        
                        MyLog.Info("Initialized PID for bumpless transfer", new Dictionary<string, object?>
                        {
                            ["PIDMemoryId"] = memory.Id,
                            ["PIDMemoryName"] = memory.Name,
                            ["CurrentOutput"] = output.Value,
                            ["ProcessVariable"] = processVariable,
                            ["SetPoint"] = setPoint
                        });
                    }
                }

                lock (_lock)
                {
                    _pids.Add(matched);
                }

                deltaTime = 1;
            }
            else
            {
                deltaTime = epochTime - matched.Timestamp;

                if (deltaTime < memory.Interval)
                {
                    return;
                }

                matched.Timestamp = epochTime;

                int changes = 0;

                if (Math.Abs(matched.PidController.Kp - memory.Kp) > 0)
                {
                    changes++;
                }

                if (Math.Abs(matched.PidController.Ki - memory.Ki) > 0)
                {
                    changes++;
                }

                if (Math.Abs(matched.PidController.Kd - memory.Kd) > 0)
                {
                    changes++;
                }

                if (Math.Abs(matched.PidController.OutputMin - memory.OutputMin) > 0)
                {
                    changes++;
                }

                if (Math.Abs(matched.PidController.OutputMax - memory.OutputMax) > 0)
                {
                    changes++;
                }

                if (Math.Abs(matched.PidController.DerivativeFilterAlpha - memory.DerivativeFilterAlpha) > 0)
                {
                    changes++;
                }

                if (Math.Abs(matched.PidController.MaxOutputSlewRate - memory.MaxOutputSlewRate) > 0)
                {
                    changes++;
                }

                if (Math.Abs(matched.PidController.DeadZone - memory.DeadZone) > 0)
                {
                    changes++;
                }

                if (Math.Abs(matched.PidController.FeedForward - memory.FeedForward) > 0)
                {
                    changes++;
                }

                if (matched.PidController.ReverseOutput != reverseOutput)
                {
                    changes++;
                }

                if (changes > 0)
                {
                    matched.PidController.Reset();
                    matched.PidController = new PIDController(memory.Kp, memory.Ki, memory.Kd, memory.OutputMin,
                        memory.OutputMax, reverseOutput)
                    {
                        DerivativeFilterAlpha = memory.DerivativeFilterAlpha,
                        MaxOutputSlewRate = memory.MaxOutputSlewRate,
                        DeadZone = memory.DeadZone,
                        FeedForward = memory.FeedForward,
                    };

                    matched.PidController.InitializeForBumplessTransfer(Convert.ToDouble(output.Value),
                        processVariable, setPoint);
                }
            }

            double result;

            if (isAuto)
            {
                result = matched.PidController.Compute(setPoint, processVariable, deltaTime);
            }
            else
            {
                result = manualValue;
            }

            // Hysteresis logic for digital output
            if (memory.DigitalOutputItemId.HasValue && memory.DigitalOutputItemId.Value != Guid.Empty)
            {
                bool newDigitalState = matched.DigitalOutputState; // Current state
                
                // State transitions with hysteresis
                if (!matched.DigitalOutputState) // Currently OFF (0)
                {
                    // Turn ON when output rises above HIGH threshold
                    if (result >= memory.HysteresisHighThreshold)
                    {
                        newDigitalState = true;
                    }
                }
                else // Currently ON (1)
                {
                    // Turn OFF when output falls below LOW threshold
                    if (result <= memory.HysteresisLowThreshold)
                    {
                        newDigitalState = false;
                    }
                }
                
                // Update state and write digital output only if state changed
                if (newDigitalState != matched.DigitalOutputState)
                {
                    matched.DigitalOutputState = newDigitalState;
                    
                    // Apply ReverseOutput by inverting the digital bit
                    bool finalDigitalState = reverseOutput ? !newDigitalState : newDigitalState;
                    
                    // Write digital output value
                    await Points.WriteOrAddValue(
                        memory.DigitalOutputItemId.Value,
                        finalDigitalState ? "1" : "0",
                        epochTime
                    );
                }
            }

            // Write analog output as normal (output is guaranteed non-null after line 253)
            await Points.WriteOrAddValue(output!.ItemId,
                result.ToString("F2", CultureInfo.InvariantCulture), epochTime);
            
            // Persist PID state to Redis for bumpless restart
            await SavePIDState(memory, matched, epochTime);
        }
        catch (Exception e)
        {
            MyLog.LogJson(new 
            { 
                Error = "PID Processing Error", 
                MemoryId = memory.Id, 
                MemoryName = memory.Name,
                Exception = e 
            });
        }
    }

    /// <summary>
    /// Generates a configuration hash for detecting PID parameter changes
    /// </summary>
    private string GenerateConfigurationHash(PIDMemory memory, bool reverseOutput)
    {
        var config = $"{memory.Kp}|{memory.Ki}|{memory.Kd}|{memory.OutputMin}|{memory.OutputMax}|" +
                    $"{memory.DerivativeFilterAlpha}|{memory.MaxOutputSlewRate}|{memory.DeadZone}|" +
                    $"{memory.FeedForward}|{reverseOutput}";
        
        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(config));
        return Convert.ToBase64String(hashBytes);
    }

    /// <summary>
    /// Loads persisted PID state from Redis if available
    /// </summary>
    private async Task<bool> LoadPIDState(PIDMemory memory, PIDDto pidDto, string configHash)
    {
        try
        {
            var savedState = await Points.GetPIDState(memory.Id);
            
            if (savedState == null)
            {
                MyLog.Debug("No saved state found for PID", new Dictionary<string, object?>
                {
                    ["PIDMemoryId"] = memory.Id,
                    ["PIDMemoryName"] = memory.Name
                });
                return false;
            }

            // Check if configuration has changed
            if (savedState.ConfigurationHash != configHash)
            {
                MyLog.Info("PID configuration changed, not restoring state", new Dictionary<string, object?>
                {
                    ["PIDMemoryId"] = memory.Id,
                    ["PIDMemoryName"] = memory.Name,
                    ["SavedHash"] = savedState.ConfigurationHash,
                    ["CurrentHash"] = configHash
                });
                return false;
            }

            // Restore the PID controller state
            pidDto.PidController.SetState(
                savedState.IntegralTerm,
                savedState.PreviousProcessVariable,
                savedState.FilteredDerivative,
                savedState.PreviousOutput
            );
            
            pidDto.DigitalOutputState = savedState.DigitalOutputState;

            MyLog.Info("Restored PID state from Redis", new Dictionary<string, object?>
            {
                ["PIDMemoryId"] = memory.Id,
                ["PIDMemoryName"] = memory.Name,
                ["IntegralTerm"] = savedState.IntegralTerm,
                ["PreviousOutput"] = savedState.PreviousOutput,
                ["LastSaveTime"] = savedState.LastUpdateTime
            });

            return true;
        }
        catch (Exception e)
        {
            MyLog.Error("Failed to load PID state from Redis", e, new Dictionary<string, object?>
            {
                ["PIDMemoryId"] = memory.Id,
                ["PIDMemoryName"] = memory.Name
            });
            return false;
        }
    }

    /// <summary>
    /// Saves PID state to Redis for persistence across restarts
    /// </summary>
    private async Task SavePIDState(PIDMemory memory, PIDDto pidDto, long epochTime)
    {
        try
        {
            var state = pidDto.PidController.GetState();
            
            var pidState = new PIDStateRedis
            {
                PIDMemoryId = memory.Id,
                IntegralTerm = state.IntegralTerm,
                PreviousProcessVariable = state.PreviousProcessVariable,
                FilteredDerivative = state.FilteredDerivative,
                PreviousOutput = state.PreviousOutput,
                DigitalOutputState = pidDto.DigitalOutputState,
                LastUpdateTime = epochTime,
                ConfigurationHash = GenerateConfigurationHash(memory, pidDto.PidController.ReverseOutput),
                ParentPIDId = memory.ParentPIDId,
                CascadeLevel = memory.CascadeLevel
            };

            await Points.SetPIDState(pidState);
        }
        catch (Exception e)
        {
            MyLog.Error("Failed to save PID state to Redis", e, new Dictionary<string, object?>
            {
                ["PIDMemoryId"] = memory.Id,
                ["PIDMemoryName"] = memory.Name
            });
        }
    }

    public class PIDDto
    {
        public Guid Id { get; set; }
        public PIDController PidController { get; set; } = null!;

        public long Timestamp { get; set; }
        
        // Digital output state for hysteresis control
        public bool DigitalOutputState { get; set; }
    }
}