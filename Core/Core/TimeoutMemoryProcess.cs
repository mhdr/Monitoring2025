using System.Collections.Concurrent;
using Core.Libs;
using Core.Models;
using Core.RedisModels;
using Microsoft.EntityFrameworkCore;

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

        foreach (var memory in memories)
        {
            try
            {
                // Get the input item to check its last update time
                var input = await Points.GetFinalItem(memory.InputItemId.ToString()); 
                var output = await Points.GetRawItem(memory.OutputItemId.ToString());

                if (input == null)
                {
                    continue;
                }

                if (output == null)
                {
                    // Create a new raw item if it doesn't exist
                    output = new RawItemRedis()
                    {
                        ItemId = memory.OutputItemId,
                    };
                }

                DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
                long epochTime = currentTimeUtc.ToUnixTimeSeconds();

                // Check if input item has timed out
                // If timeout exceeded: set output to "1" (fault/communication lost)
                // If input is fresh: set output to "0" (healthy/communication active)
                if (epochTime - input.Time > memory.Timeout)
                {
                    output.Value = "1";  // Timeout exceeded - fault condition
                }
                else
                {
                    output.Value = "0";  // Input is updating regularly - healthy
                }

                output.Time = epochTime;

                // await Points.SetRawItem(output);
                await Points.WriteOrAddValue(output.ItemId, output.Value, output.Time);
            }
            catch (Exception e)
            {
                MyLog.LogJson(e);
            }
        }
    }
}