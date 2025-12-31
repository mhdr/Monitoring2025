using Core.Libs;
using Core.Models;
using Core.RedisModels;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Processes write action memory configurations, executing write operations every cycle.
/// Simplified: no input monitoring, no interval checking, no execution limits.
/// Duration parameter controls write timing in each cycle.
/// </summary>
public class WriteActionMemoryProcess
{
    private static WriteActionMemoryProcess? _instance;
    private static readonly object _lock = new object();
    private static Task? _runTask;
    private DataContext? _context;

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
    /// Kept for compatibility but no longer maintains cache.
    /// </summary>
    public void InvalidateCache(Guid memoryId)
    {
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
    /// Simplified: processes every cycle (no interval checking, no execution count limits).
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

        // 2. Batch fetch all required items
        var allOutputIds = new HashSet<string>();
        var allSourceIds = new HashSet<string>();

        foreach (var memory in memories)
        {
            allOutputIds.Add(memory.OutputItemId.ToString());
            if (memory.OutputValueSourceItemId.HasValue)
            {
                allSourceIds.Add(memory.OutputValueSourceItemId.Value.ToString());
            }
        }

        var sourceItemsCache = allSourceIds.Count > 0 
            ? await Points.GetFinalItemsBatch(allSourceIds.ToList()) 
            : new Dictionary<string, FinalItemRedis>();

        MyLog.Debug("Batch fetched items for WriteActionMemory processing", new Dictionary<string, object?>
        {
            ["MemoryCount"] = memories.Count,
            ["SourceItemsFetched"] = sourceItemsCache.Count
        });

        // 3. Process each memory
        foreach (var memory in memories)
        {
            try
            {
                await ProcessSingleMemory(memory, sourceItemsCache, epochTime);
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
        Dictionary<string, FinalItemRedis> sourceItemsCache,
        long epochTime)
    {
        // 1. Resolve output value
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

        // 2. Execute write operation
        bool success = await Points.WriteOrAddValue(
            memory.OutputItemId,
            outputValue,
            epochTime,
            memory.Duration
        );

        if (success)
        {
            MyLog.Info($"WriteActionMemory {memory.Id} executed successfully", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["MemoryName"] = memory.Name,
                ["OutputValue"] = outputValue
            });
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
