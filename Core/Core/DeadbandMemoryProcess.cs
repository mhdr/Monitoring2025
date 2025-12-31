using Core.Libs;
using Core.Models;
using Core.RedisModels;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Processor for Deadband/Hysteresis Memory
/// 
/// For analog inputs: Applies value-based deadband filtering
/// - Absolute: Output changes only when |current - lastOutput| > deadband
/// - Percentage: Output changes only when |current - lastOutput| > (deadband% × span)
/// - RateOfChange: Output changes only when |current - lastInput| / elapsedSeconds > deadband
/// 
/// For digital inputs: Applies time-based stability filtering
/// - Output changes only after input remains stable for StabilityTime seconds
/// </summary>
public class DeadbandMemoryProcess
{
    // Singleton instance
    private static DeadbandMemoryProcess? _instance;
    private static readonly object _lock = new object();
    private static Task? _runTask;

    private DataContext? _context;

    // Track last execution time for each memory to respect interval
    private readonly Dictionary<Guid, long> _lastExecutionTimes = new();

    // Private constructor to enforce Singleton
    private DeadbandMemoryProcess()
    {
        _context = null;
    }

    // Singleton instance access
    public static DeadbandMemoryProcess Instance
    {
        get
        {
            lock (_lock)
            {
                if (_instance == null)
                {
                    _instance = new DeadbandMemoryProcess();
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
                        catch (Exception ex)
                        {
                            MyLog.LogJson(ex);
                        }
                        finally
                        {
                            await Task.Delay(1000); // Delay to prevent rapid loops
                        }
                    }
                });
            }
        }

        await _runTask;
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
                MyLog.Info("DeadbandMemoryProcess: Database connection established");
                return;
            }
            catch (Exception ex)
            {
                MyLog.Info($"DeadbandMemoryProcess: Waiting for database connection... Attempt {i + 1}/{maxRetries}");
                if (i == maxRetries - 1)
                {
                    MyLog.LogJson(ex);
                    throw;
                }
                await Task.Delay(retryDelay);
            }
        }
    }

    public async Task Process()
    {
        var memories = await _context!.DeadbandMemories
            .Where(m => !m.IsDisabled)
            .ToListAsync();

        if (memories.Count == 0)
            return;

        long epochTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        // Filter memories that should be processed based on interval
        var memoriesToProcess = memories.Where(memory =>
        {
            if (!_lastExecutionTimes.TryGetValue(memory.Id, out var lastExecution))
            {
                return true; // First execution
            }
            return (epochTime - lastExecution) >= memory.Interval;
        }).ToList();

        if (memoriesToProcess.Count == 0)
            return;

        // Collect all unique input and output item IDs for batch fetching
        var allInputIds = new HashSet<string>();
        var allOutputIds = new HashSet<string>();

        foreach (var memory in memoriesToProcess)
        {
            allInputIds.Add(memory.InputItemId.ToString());
            allOutputIds.Add(memory.OutputItemId.ToString());
        }

        // Batch fetch all required Redis items (performance optimization)
        var inputItemsCache = await Points.GetFinalItemsBatch(allInputIds.ToList());
        var outputItemsCache = await Points.GetRawItemsBatch(allOutputIds.ToList());

        // Get monitoring items to determine input types
        var monitoringItemIds = allInputIds.Select(id => Guid.Parse(id)).ToList();
        var monitoringItems = await _context.MonitoringItems
            .Where(m => monitoringItemIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id, m => m.ItemType);

        MyLog.Debug("Batch fetched Redis items for Deadband processing", new Dictionary<string, object?>
        {
            ["MemoryCount"] = memoriesToProcess.Count,
            ["InputItemsRequested"] = allInputIds.Count,
            ["InputItemsFetched"] = inputItemsCache.Count,
            ["OutputItemsRequested"] = allOutputIds.Count,
            ["OutputItemsFetched"] = outputItemsCache.Count
        });

        // Process each memory
        foreach (var memory in memoriesToProcess)
        {
            try
            {
                // Determine if input is analog or digital
                if (!monitoringItems.TryGetValue(memory.InputItemId, out var inputType))
                {
                    MyLog.Warning("Input item type not found", new Dictionary<string, object?>
                    {
                        ["MemoryId"] = memory.Id,
                        ["InputItemId"] = memory.InputItemId
                    });
                    continue;
                }

                bool isAnalog = inputType == ItemType.AnalogInput || inputType == ItemType.AnalogOutput;

                if (isAnalog)
                {
                    await ProcessAnalogDeadband(memory, inputItemsCache, epochTime);
                }
                else
                {
                    await ProcessDigitalStability(memory, inputItemsCache, epochTime);
                }

                _lastExecutionTimes[memory.Id] = epochTime;
            }
            catch (Exception ex)
            {
                MyLog.Error($"Failed to process DeadbandMemory {memory.Id}", ex, new Dictionary<string, object?>
                {
                    ["MemoryId"] = memory.Id,
                    ["MemoryName"] = memory.Name
                });
            }
        }
    }

    /// <summary>
    /// Process analog deadband filtering (Absolute, Percentage, or RateOfChange)
    /// </summary>
    private async Task ProcessAnalogDeadband(
        DeadbandMemory memory,
        Dictionary<string, FinalItemRedis> inputItemsCache,
        long epochTime)
    {
        var inputKey = memory.InputItemId.ToString();
        
        // Get input item from cache
        if (!inputItemsCache.TryGetValue(inputKey, out var inputItem))
        {
            MyLog.Warning("Input item not found in cache", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["InputItemId"] = memory.InputItemId
            });
            return;
        }

        // Parse current input value
        if (!double.TryParse(inputItem.Value, out double currentValue))
        {
            MyLog.Warning("Failed to parse input value for deadband", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["InputValue"] = inputItem.Value
            });
            return;
        }

        bool shouldUpdate = false;
        double outputValue = currentValue;

        // First run - always write initial value
        if (!memory.LastOutputValue.HasValue)
        {
            shouldUpdate = true;
            MyLog.Debug("Deadband memory first run - initializing", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["InitialValue"] = currentValue
            });
        }
        else
        {
            switch (memory.DeadbandType)
            {
                case DeadbandType.Absolute:
                    // Output changes only when |current - lastOutput| > deadband
                    double absoluteDiff = Math.Abs(currentValue - memory.LastOutputValue.Value);
                    shouldUpdate = absoluteDiff > memory.Deadband;
                    break;

                case DeadbandType.Percentage:
                    // Output changes only when |current - lastOutput| > (deadband% × span)
                    double span = memory.InputMax - memory.InputMin;
                    if (span <= 0)
                    {
                        MyLog.Warning("Invalid input range for percentage deadband", new Dictionary<string, object?>
                        {
                            ["MemoryId"] = memory.Id,
                            ["InputMin"] = memory.InputMin,
                            ["InputMax"] = memory.InputMax
                        });
                        return;
                    }
                    double percentThreshold = (memory.Deadband / 100.0) * span;
                    double percentDiff = Math.Abs(currentValue - memory.LastOutputValue.Value);
                    shouldUpdate = percentDiff > percentThreshold;
                    break;

                case DeadbandType.RateOfChange:
                    // Output changes only when rate of change exceeds threshold (units per second)
                    if (memory.LastInputValue.HasValue && memory.LastTimestamp.HasValue)
                    {
                        double elapsedSeconds = epochTime - memory.LastTimestamp.Value;
                        if (elapsedSeconds > 0)
                        {
                            double rateOfChange = Math.Abs(currentValue - memory.LastInputValue.Value) / elapsedSeconds;
                            shouldUpdate = rateOfChange > memory.Deadband;
                        }
                    }
                    else
                    {
                        // First sample for rate calculation - don't update yet
                        shouldUpdate = false;
                    }
                    break;
            }
        }

        // Update state
        memory.LastInputValue = currentValue;
        memory.LastTimestamp = epochTime;

        if (shouldUpdate)
        {
            memory.LastOutputValue = currentValue;
            
            // Write to output
            await Points.WriteOrAddValue(memory.OutputItemId, currentValue.ToString());

            MyLog.Debug("Deadband filter triggered update", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["MemoryName"] = memory.Name,
                ["DeadbandType"] = memory.DeadbandType.ToString(),
                ["InputValue"] = currentValue,
                ["OutputValue"] = currentValue
            });
        }

        // Save state to database
        _context!.DeadbandMemories.Update(memory);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Process digital stability filtering (time-based debounce)
    /// Output changes only after input remains stable for StabilityTime seconds
    /// </summary>
    private async Task ProcessDigitalStability(
        DeadbandMemory memory,
        Dictionary<string, FinalItemRedis> inputItemsCache,
        long epochTime)
    {
        var inputKey = memory.InputItemId.ToString();
        
        // Get input item from cache
        if (!inputItemsCache.TryGetValue(inputKey, out var inputItem))
        {
            MyLog.Warning("Input item not found in cache", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["InputItemId"] = memory.InputItemId
            });
            return;
        }

        // Parse current digital state (0/false = off, 1/true = on)
        bool currentState = inputItem.Value == "1" || 
                           inputItem.Value?.ToLowerInvariant() == "true" ||
                           (double.TryParse(inputItem.Value, out double numValue) && numValue != 0);

        bool shouldUpdate = false;
        bool outputState = currentState;

        // First run - always write initial value
        if (!memory.LastOutputValue.HasValue)
        {
            shouldUpdate = true;
            memory.PendingDigitalState = null;
            memory.LastChangeTime = null;
            MyLog.Debug("Digital deadband memory first run - initializing", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["InitialState"] = currentState
            });
        }
        else
        {
            bool lastOutputState = memory.LastOutputValue.Value != 0;

            // Check if input state differs from current output state
            if (currentState != lastOutputState)
            {
                // Input has changed from output state
                if (!memory.PendingDigitalState.HasValue || memory.PendingDigitalState.Value != currentState)
                {
                    // Start tracking new pending state
                    memory.PendingDigitalState = currentState;
                    memory.LastChangeTime = epochTime;
                    MyLog.Debug("Digital deadband: new pending state detected", new Dictionary<string, object?>
                    {
                        ["MemoryId"] = memory.Id,
                        ["PendingState"] = currentState,
                        ["StabilityRequired"] = memory.StabilityTime
                    });
                }
                else
                {
                    // Pending state is same - check if stability time has elapsed
                    if (memory.LastChangeTime.HasValue)
                    {
                        double elapsedSeconds = epochTime - memory.LastChangeTime.Value;
                        if (elapsedSeconds >= memory.StabilityTime)
                        {
                            // Input has been stable for required duration - update output
                            shouldUpdate = true;
                            outputState = currentState;
                            memory.PendingDigitalState = null;
                            memory.LastChangeTime = null;
                            MyLog.Debug("Digital deadband: stability time reached, updating output", new Dictionary<string, object?>
                            {
                                ["MemoryId"] = memory.Id,
                                ["NewState"] = currentState,
                                ["ElapsedSeconds"] = elapsedSeconds
                            });
                        }
                    }
                }
            }
            else
            {
                // Input matches current output - clear any pending state
                if (memory.PendingDigitalState.HasValue)
                {
                    memory.PendingDigitalState = null;
                    memory.LastChangeTime = null;
                    MyLog.Debug("Digital deadband: input returned to output state, cleared pending", new Dictionary<string, object?>
                    {
                        ["MemoryId"] = memory.Id,
                        ["CurrentState"] = currentState
                    });
                }
            }
        }

        // Update state
        memory.LastInputValue = currentState ? 1.0 : 0.0;
        memory.LastTimestamp = epochTime;

        if (shouldUpdate)
        {
            memory.LastOutputValue = outputState ? 1.0 : 0.0;
            
            // Write to output
            await Points.WriteOrAddValue(memory.OutputItemId, outputState ? "1" : "0");

            MyLog.Debug("Digital deadband filter triggered update", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["MemoryName"] = memory.Name,
                ["OutputState"] = outputState
            });
        }

        // Save state to database
        _context!.DeadbandMemories.Update(memory);
        await _context.SaveChangesAsync();
    }
}
