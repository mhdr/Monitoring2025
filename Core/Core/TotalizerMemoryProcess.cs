using Cronos;
using Core.Libs;
using Core.Models;
using Core.RedisModels;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Processor for Totalizer/Accumulator Memory with trapezoidal integration, edge detection, and scheduled resets
/// </summary>
public class TotalizerMemoryProcess
{
    // Singleton instance
    private static TotalizerMemoryProcess? _instance;
    private static readonly object _lock = new object();
    private static Task? _runTask;

    private DataContext? _context;

    // Track last execution time for each memory to respect interval
    private readonly Dictionary<Guid, long> _lastExecutionTimes = new();
    
    // Track next scheduled reset time for each memory
    private readonly Dictionary<Guid, DateTime?> _nextScheduledResets = new();

    // Private constructor to enforce Singleton
    private TotalizerMemoryProcess()
    {
        _context = null;
    }

    // Singleton instance access
    public static TotalizerMemoryProcess Instance
    {
        get
        {
            lock (_lock)
            {
                if (_instance == null)
                {
                    _instance = new TotalizerMemoryProcess();
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
                MyLog.Info("TotalizerMemoryProcess: Database connection established");
                return;
            }
            catch (Exception ex)
            {
                MyLog.Info($"TotalizerMemoryProcess: Waiting for database connection... Attempt {i + 1}/{maxRetries}");
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
        var memories = await _context!.TotalizerMemories
            .Where(m => !m.IsDisabled)
            .ToListAsync();

        if (memories.Count == 0)
            return;

        long epochTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        DateTime utcNow = DateTime.UtcNow;

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

        MyLog.Debug("Batch fetched Redis items for Totalizer processing", new Dictionary<string, object?>
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
                await ProcessSingleTotalizer(memory, inputItemsCache, outputItemsCache, epochTime, utcNow);
                _lastExecutionTimes[memory.Id] = epochTime;
            }
            catch (Exception ex)
            {
                MyLog.Error($"Failed to process TotalizerMemory {memory.Id}", ex, new Dictionary<string, object?>
                {
                    ["MemoryId"] = memory.Id,
                    ["MemoryName"] = memory.Name
                });
            }
        }
    }

    private async Task ProcessSingleTotalizer(
        TotalizerMemory memory,
        Dictionary<string, FinalItemRedis> inputItemsCache,
        Dictionary<string, RawItemRedis> outputItemsCache,
        long epochTime,
        DateTime utcNow)
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

        // Check for scheduled reset before processing
        if (await CheckAndExecuteScheduledReset(memory, utcNow))
        {
            // Reset occurred, reload memory from database for updated state
            var reloadedMemory = await _context!.TotalizerMemories.FindAsync(memory.Id);
            if (reloadedMemory == null) return;
            memory = reloadedMemory;
        }

        double newAccumulation = 0.0;
        bool shouldUpdateDatabase = false;

        // Process based on accumulation type
        switch (memory.AccumulationType)
        {
            case AccumulationType.RateIntegration:
                newAccumulation = ProcessRateIntegration(memory, inputItem, epochTime, out shouldUpdateDatabase);
                break;
                
            case AccumulationType.EventCountRising:
                newAccumulation = ProcessEventCounting(memory, inputItem, true, false, out shouldUpdateDatabase);
                break;
                
            case AccumulationType.EventCountFalling:
                newAccumulation = ProcessEventCounting(memory, inputItem, false, true, out shouldUpdateDatabase);
                break;
                
            case AccumulationType.EventCountBoth:
                newAccumulation = ProcessEventCounting(memory, inputItem, true, true, out shouldUpdateDatabase);
                break;
        }

        // Update accumulated value in memory
        memory.AccumulatedValue = newAccumulation;

        // Check for overflow and auto-reset
        if (memory.ResetOnOverflow && 
            memory.OverflowThreshold.HasValue && 
            memory.AccumulatedValue >= memory.OverflowThreshold.Value)
        {
            MyLog.Info("Totalizer overflow detected, auto-resetting", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["MemoryName"] = memory.Name,
                ["AccumulatedValue"] = memory.AccumulatedValue,
                ["Threshold"] = memory.OverflowThreshold.Value
            });

            memory.AccumulatedValue = 0.0;
            memory.LastInputValue = null;
            memory.LastEventState = null;
            memory.LastResetTime = utcNow;
            shouldUpdateDatabase = true;
        }

        // Write accumulated value to output
        var formattedValue = Math.Round(memory.AccumulatedValue, memory.DecimalPlaces).ToString($"F{memory.DecimalPlaces}");
        await Points.WriteOrAddValue(memory.OutputItemId, formattedValue, epochTime);

        // Persist state to database if needed
        if (shouldUpdateDatabase)
        {
            _context!.TotalizerMemories.Update(memory);
            await _context.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Process rate integration using trapezoidal rule
    /// </summary>
    private double ProcessRateIntegration(TotalizerMemory memory, FinalItemRedis inputItem, long epochTime, out bool shouldUpdateDatabase)
    {
        shouldUpdateDatabase = false;
        
        if (!double.TryParse(inputItem.Value, out double currentValue))
        {
            MyLog.Warning("Failed to parse input value for rate integration", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["InputValue"] = inputItem.Value
            });
            return memory.AccumulatedValue;
        }

        // First run - establish baseline
        if (!memory.LastInputValue.HasValue)
        {
            memory.LastInputValue = currentValue;
            shouldUpdateDatabase = true;
            MyLog.Debug("Totalizer baseline established", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["BaselineValue"] = currentValue
            });
            return memory.AccumulatedValue; // Don't accumulate on first reading
        }

        // Trapezoidal rule: accumulation += (lastValue + currentValue) / 2 * intervalSeconds
        double intervalSeconds = memory.Interval;
        double increment = (memory.LastInputValue.Value + currentValue) / 2.0 * intervalSeconds;
        
        memory.LastInputValue = currentValue;
        shouldUpdateDatabase = true;

        return memory.AccumulatedValue + increment;
    }

    /// <summary>
    /// Process event counting with edge detection (rising, falling, or both)
    /// </summary>
    private double ProcessEventCounting(
        TotalizerMemory memory, 
        FinalItemRedis inputItem, 
        bool countRising, 
        bool countFalling, 
        out bool shouldUpdateDatabase)
    {
        shouldUpdateDatabase = false;

        bool currentState;
        
        // Parse digital state (true/false, 1/0, on/off, etc.)
        if (bool.TryParse(inputItem.Value, out bool boolValue))
        {
            currentState = boolValue;
        }
        else if (int.TryParse(inputItem.Value, out int intValue))
        {
            currentState = intValue != 0;
        }
        else if (inputItem.Value?.ToLower() == "on" || inputItem.Value?.ToLower() == "high")
        {
            currentState = true;
        }
        else if (inputItem.Value?.ToLower() == "off" || inputItem.Value?.ToLower() == "low")
        {
            currentState = false;
        }
        else
        {
            MyLog.Warning("Failed to parse input value for event counting", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["InputValue"] = inputItem.Value
            });
            return memory.AccumulatedValue;
        }

        // First run - establish baseline, no counting
        if (!memory.LastEventState.HasValue)
        {
            memory.LastEventState = currentState;
            shouldUpdateDatabase = true;
            MyLog.Debug("Event counter baseline established", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["BaselineState"] = currentState
            });
            return memory.AccumulatedValue;
        }

        int eventCount = 0;

        // Detect edges
        bool risingEdge = !memory.LastEventState.Value && currentState;
        bool fallingEdge = memory.LastEventState.Value && !currentState;

        if (countRising && risingEdge)
        {
            eventCount++;
            MyLog.Debug("Rising edge detected", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["Count"] = memory.AccumulatedValue + 1
            });
        }

        if (countFalling && fallingEdge)
        {
            eventCount++;
            MyLog.Debug("Falling edge detected", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["Count"] = memory.AccumulatedValue + 1
            });
        }

        memory.LastEventState = currentState;
        if (eventCount > 0)
        {
            shouldUpdateDatabase = true;
        }

        return memory.AccumulatedValue + eventCount;
    }

    /// <summary>
    /// Check if scheduled reset should occur and execute if needed
    /// </summary>
    private async Task<bool> CheckAndExecuteScheduledReset(TotalizerMemory memory, DateTime utcNow)
    {
        if (!memory.ScheduledResetEnabled || string.IsNullOrWhiteSpace(memory.ResetCron))
            return false;

        try
        {
            var cronExpression = CronExpression.Parse(memory.ResetCron);
            
            // Calculate next occurrence from last reset time (or now if never reset)
            var fromTime = memory.LastResetTime ?? utcNow.AddSeconds(-memory.Interval);
            var nextOccurrence = cronExpression.GetNextOccurrence(fromTime, TimeZoneInfo.Utc);

            if (!nextOccurrence.HasValue)
                return false;

            // Check if we've passed the scheduled reset time
            if (utcNow >= nextOccurrence.Value)
            {
                // Update cached next reset time
                _nextScheduledResets[memory.Id] = cronExpression.GetNextOccurrence(utcNow, TimeZoneInfo.Utc);

                // Execute reset
                MyLog.Info("Executing scheduled reset for totalizer", new Dictionary<string, object?>
                {
                    ["MemoryId"] = memory.Id,
                    ["MemoryName"] = memory.Name,
                    ["ScheduledTime"] = nextOccurrence.Value,
                    ["AccumulatedValue"] = memory.AccumulatedValue
                });

                memory.AccumulatedValue = 0.0;
                memory.LastInputValue = null;
                memory.LastEventState = null;
                memory.LastResetTime = utcNow;

                _context!.TotalizerMemories.Update(memory);
                await _context.SaveChangesAsync();

                // Write zero to output
                await Points.WriteOrAddValue(memory.OutputItemId, "0");

                return true;
            }
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to check/execute scheduled reset", ex, new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["CronExpression"] = memory.ResetCron
            });
        }

        return false;
    }
}
