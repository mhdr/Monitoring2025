using System.Collections.Concurrent;
using Core.Libs;
using Core.Models;
using Core.RedisModels;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;

namespace Core;

public class TimeoutMemoryProcess
{
    // Singleton instance
    private static TimeoutMemoryProcess? _instance;
    private static readonly object _lock = new object();
    private static Task? _runTask;

    private DataContext? _context;

    // Private constructor to enforce Singleton
    private TimeoutMemoryProcess()
    {
        _context = null;
    }

    // Singleton instance access
    public static TimeoutMemoryProcess Instance
    {
        get
        {
            lock (_lock) // Ensure thread-safe access to the instance
            {
                if (_instance == null)
                {
                    _instance = new TimeoutMemoryProcess();
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
                MyLog.LogJson("TimeoutMemoryProcess", "Database connection established");
                return;
            }
            catch (Exception ex)
            {
                MyLog.LogJson("TimeoutMemoryProcess", $"Waiting for database connection... Attempt {i + 1}/{maxRetries}");
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
        var memories = await _context!.TimeoutMemories.ToListAsync();

        if (memories.Count == 0)
            return;

        // Separate Point and GlobalVariable references for batch fetching
        var inputPointIds = memories
            .Where(m => m.InputType == Models.TimeoutSourceType.Point)
            .Select(m => m.InputReference)
            .Distinct()
            .ToList();
        
        var outputPointIds = memories
            .Where(m => m.OutputType == Models.TimeoutSourceType.Point)
            .Select(m => m.OutputReference)
            .Distinct()
            .ToList();
        
        // Batch fetch all Point items from Redis
        var inputItemsCache = await Points.GetFinalItemsBatch(inputPointIds);
        var outputItemsCache = await Points.GetRawItemsBatch(outputPointIds);
        
        MyLog.Debug("Batch fetched Redis items for Timeout processing", new Dictionary<string, object?>
        {
            ["MemoryCount"] = memories.Count,
            ["InputPointsRequested"] = inputPointIds.Count,
            ["InputPointsFetched"] = inputItemsCache.Count,
            ["OutputPointsRequested"] = outputPointIds.Count,
            ["OutputPointsFetched"] = outputItemsCache.Count
        });

        foreach (var memory in memories)
        {
            try
            {
                // Fetch input value and timestamp based on source type
                string? inputValue = null;
                long inputTime = 0;
                
                if (memory.InputType == Models.TimeoutSourceType.Point)
                {
                    // Use cached batch-fetched Point item
                    if (inputItemsCache.TryGetValue(memory.InputReference, out var inputItem))
                    {
                        inputValue = inputItem.Value;
                        inputTime = inputItem.Time;
                    }
                }
                else if (memory.InputType == Models.TimeoutSourceType.GlobalVariable)
                {
                    // Fetch Global Variable directly (fresh read each cycle)
                    // We need to get the full Redis object to access LastUpdateTime
                    var db = RedisConnection.Instance.GetDatabase();
                    var key = $"GlobalVariable:{memory.InputReference}";
                    var json = await db.StringGetAsync(key);
                    
                    if (json.HasValue)
                    {
                        var gvRedis = JsonConvert.DeserializeObject<RedisModels.GlobalVariableRedis>(json.ToString());
                        if (gvRedis != null)
                        {
                            inputValue = gvRedis.Value;
                            inputTime = gvRedis.LastUpdateTime / 1000; // Convert milliseconds to seconds
                        }
                    }
                }

                if (inputValue == null)
                {
                    continue; // Skip if input not found
                }

                DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
                long epochTime = currentTimeUtc.ToUnixTimeSeconds();

                // Check if input has timed out
                string outputValue;
                if (epochTime - inputTime > memory.Timeout)
                {
                    outputValue = "1";  // Timeout exceeded
                }
                else
                {
                    outputValue = "0";  // Input is updating regularly
                }

                // Write output value based on source type
                if (memory.OutputType == Models.TimeoutSourceType.Point)
                {
                    // Write to Point item
                    if (Guid.TryParse(memory.OutputReference, out var outputItemId))
                    {
                        await Points.WriteOrAddValue(outputItemId, outputValue, epochTime);
                    }
                }
                else if (memory.OutputType == Models.TimeoutSourceType.GlobalVariable)
                {
                    // Write to Global Variable
                    await GlobalVariableProcess.SetVariable(memory.OutputReference, outputValue);
                }
            }
            catch (Exception e)
            {
                MyLog.LogJson(e);
            }
        }
    }
}