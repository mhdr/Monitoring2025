using Core.Libs;
using Core.Models;
using Core.RedisModels;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Processes write action memory configurations, monitoring input items and executing
/// write operations with configurable execution limits and dynamic/static output values.
/// </summary>
public class WriteActionMemoryProcess
{
    private static WriteActionMemoryProcess? _instance;
    private static readonly object _lock = new object();
    private static Task? _runTask;
    private DataContext? _context;

    // Track last execution time for each memory to enforce intervals
    private readonly Dictionary<Guid, long> _lastExecutionTimes = new();

    private WriteActionMemoryProcess()
    {
        _context = null;
    }

    public static WriteActionMemoryProcess Instance
    {
        get
        {
            lock (_lock)
            {
                if (_instance == null)
                {
                    _instance = new WriteActionMemoryProcess();
                }
            }
            return _instance;
        }
    }

    /// <summary>
    /// Invalidates cached state when a memory is edited.
    /// </summary>
    public void InvalidateCache(Guid memoryId)
    {
        lock (_lock)
        {
            _lastExecutionTimes.Remove(memoryId);
        }
        
        MyLog.Debug("WriteActionMemoryProcess: Cache invalidated", new Dictionary<string, object?>
        {
            ["MemoryId"] = memoryId
        });
    }

    /// <summary>
    /// Main run loop that processes all enabled write action memories.
    /// </summary>
    public async Task Run()
    {
        lock (_lock)
        {
            if (_runTask == null)
            {
                _runTask = Task.Run(async () =>
                {
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
                            await Task.Delay(1000); // 1-second cycle
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
                MyLog.Info("WriteActionMemoryProcess: Database connection established");
                return;
            }
            catch (Exception ex)
            {
                MyLog.Info($"WriteActionMemoryProcess: Waiting for database... Attempt {i + 1}/{maxRetries}");
                if (i == maxRetries - 1)
                {
                    MyLog.LogJson(ex);
                    throw;
                }
                await Task.Delay(retryDelay);
            }
        }
    }

    /// <summary>
    /// Processes all enabled write action memories that are due for execution.
    /// </summary>
    public async Task Process()
    {
        // 1. Load enabled memories
        var memories = await _context!.WriteActionMemories
            .Where(m => !m.IsDisabled)
            .ToListAsync();

        if (memories.Count == 0)
            return;

        long epochTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        // 2. Filter by interval and execution count limits
        var memoriesToProcess = new List<WriteActionMemory>();
        
        foreach (var memory in memories)
        {
            // Check if execution count limit reached
            if (memory.MaxExecutionCount.HasValue && 
                memory.CurrentExecutionCount >= memory.MaxExecutionCount.Value)
            {
                continue; // Skip - limit reached
            }

            // Check if interval has elapsed
            if (!_lastExecutionTimes.TryGetValue(memory.Id, out var lastExecution))
            {
                memoriesToProcess.Add(memory); // First execution
            }
            else if ((epochTime - lastExecution) >= memory.Interval)
            {
                memoriesToProcess.Add(memory); // Interval elapsed
            }
        }

        if (memoriesToProcess.Count == 0)
            return;

        // 3. Batch fetch all required items
        var allInputIds = new HashSet<string>();
        var allOutputIds = new HashSet<string>();
        var allSourceIds = new HashSet<string>();

        foreach (var memory in memoriesToProcess)
        {
            allInputIds.Add(memory.InputItemId.ToString());
            allOutputIds.Add(memory.OutputItemId.ToString());
            if (memory.OutputValueSourceItemId.HasValue)
            {
                allSourceIds.Add(memory.OutputValueSourceItemId.Value.ToString());
            }
        }

        var inputItemsCache = await Points.GetFinalItemsBatch(allInputIds.ToList());
        var sourceItemsCache = allSourceIds.Count > 0 
            ? await Points.GetFinalItemsBatch(allSourceIds.ToList()) 
            : new Dictionary<string, FinalItemRedis>();

        MyLog.Debug("Batch fetched items for WriteActionMemory processing", new Dictionary<string, object?>
        {
            ["MemoryCount"] = memoriesToProcess.Count,
            ["InputItemsFetched"] = inputItemsCache.Count,
            ["SourceItemsFetched"] = sourceItemsCache.Count
        });

        // 4. Process each memory
        foreach (var memory in memoriesToProcess)
        {
            try
            {
                await ProcessSingleMemory(memory, inputItemsCache, sourceItemsCache, epochTime);
            }
            catch (Exception ex)
            {
                MyLog.Error($"Failed to process WriteActionMemory {memory.Id}", ex, new Dictionary<string, object?>
                {
                    ["MemoryId"] = memory.Id,
                    ["MemoryName"] = memory.Name
                });
            }
        }
    }

    private async Task ProcessSingleMemory(
        WriteActionMemory memory,
        Dictionary<string, FinalItemRedis> inputItemsCache,
        Dictionary<string, FinalItemRedis> sourceItemsCache,
        long epochTime)
    {
        // 1. Get input item from cache (just for validation that it exists)
        if (!inputItemsCache.TryGetValue(memory.InputItemId.ToString(), out var inputItem))
        {
            MyLog.Debug($"WriteActionMemory {memory.Id}: Input item not found in cache");
            return;
        }

        // 2. Resolve output value
        string? outputValue = null;

        if (memory.OutputValueSourceItemId.HasValue)
        {
            // Dynamic mode - read from source item
            if (sourceItemsCache.TryGetValue(memory.OutputValueSourceItemId.Value.ToString(), out var sourceItem))
            {
                if (string.IsNullOrEmpty(sourceItem.Value))
                {
                    MyLog.Debug($"WriteActionMemory {memory.Id}: Source item has empty value");
                    return;
                }
                outputValue = sourceItem.Value;
                
                MyLog.Debug($"WriteActionMemory {memory.Id}: Using dynamic value from source", new Dictionary<string, object?>
                {
                    ["SourceItemId"] = memory.OutputValueSourceItemId.Value,
                    ["Value"] = outputValue
                });
            }
            else
            {
                MyLog.Debug($"WriteActionMemory {memory.Id}: Source item not found in cache");
                return;
            }
        }
        else if (!string.IsNullOrEmpty(memory.OutputValue))
        {
            // Static mode - use configured value
            outputValue = memory.OutputValue;
            
            MyLog.Debug($"WriteActionMemory {memory.Id}: Using static value", new Dictionary<string, object?>
            {
                ["Value"] = outputValue
            });
        }
        else
        {
            MyLog.Warning($"WriteActionMemory {memory.Id}: No output value configured");
            return;
        }

        // 3. Execute write operation
        bool success = await Points.WriteOrAddValue(
            memory.OutputItemId,
            outputValue,
            epochTime,
            memory.Duration
        );

        if (success)
        {
            // 4. Update execution tracking
            _lastExecutionTimes[memory.Id] = epochTime;

            // 5. Increment execution count in database
            await using var context = new DataContext();
            var memoryToUpdate = await context.WriteActionMemories.FindAsync(memory.Id);
            if (memoryToUpdate != null)
            {
                memoryToUpdate.CurrentExecutionCount++;
                await context.SaveChangesAsync();

                MyLog.Info($"WriteActionMemory {memory.Id} executed successfully", new Dictionary<string, object?>
                {
                    ["MemoryId"] = memory.Id,
                    ["MemoryName"] = memory.Name,
                    ["OutputValue"] = outputValue,
                    ["ExecutionCount"] = memoryToUpdate.CurrentExecutionCount,
                    ["MaxExecutionCount"] = memoryToUpdate.MaxExecutionCount
                });

                // Log if execution limit reached
                if (memoryToUpdate.MaxExecutionCount.HasValue &&
                    memoryToUpdate.CurrentExecutionCount >= memoryToUpdate.MaxExecutionCount.Value)
                {
                    MyLog.Info($"WriteActionMemory {memory.Id} reached execution limit", new Dictionary<string, object?>
                    {
                        ["MemoryId"] = memory.Id,
                        ["MemoryName"] = memory.Name,
                        ["ExecutionCount"] = memoryToUpdate.CurrentExecutionCount,
                        ["MaxExecutionCount"] = memoryToUpdate.MaxExecutionCount.Value
                    });
                }
            }
        }
        else
        {
            MyLog.Warning($"WriteActionMemory {memory.Id}: Write operation failed", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["OutputItemId"] = memory.OutputItemId,
                ["OutputValue"] = outputValue
            });
        }
    }
}
