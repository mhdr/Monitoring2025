using Core.Libs;
using Core.Models;
using Core.RedisModels;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Processor for Schedule Memory - evaluates time-based schedules and writes outputs
/// Supports weekly schedules, holiday exceptions, priority-based conflict resolution,
/// and manual override with time-based or event-based expiration
/// </summary>
public class ScheduleMemoryProcess
{
    // Singleton instance
    private static ScheduleMemoryProcess? _instance;
    private static readonly object _lock = new object();
    private static Task? _runTask;

    private DataContext? _context;

    // Track last execution time for each memory to respect interval
    private readonly Dictionary<Guid, long> _lastExecutionTimes = new();

    // Private constructor to enforce Singleton
    private ScheduleMemoryProcess()
    {
        _context = null;
    }

    // Singleton instance access
    public static ScheduleMemoryProcess Instance
    {
        get
        {
            lock (_lock)
            {
                if (_instance == null)
                {
                    _instance = new ScheduleMemoryProcess();
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
                MyLog.Info("ScheduleMemoryProcess: Database connection established");
                return;
            }
            catch (Exception ex)
            {
                MyLog.Info($"ScheduleMemoryProcess: Waiting for database connection... Attempt {i + 1}/{maxRetries}");
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
        var memories = await _context!.ScheduleMemories
            .Where(m => !m.IsDisabled)
            .Include(m => m.ScheduleBlocks)
            .Include(m => m.HolidayCalendar)
            .ThenInclude(c => c!.Dates)
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

        // Collect all unique output item IDs for batch fetching
        var allOutputIds = new HashSet<string>();
        foreach (var memory in memoriesToProcess)
        {
            allOutputIds.Add(memory.OutputItemId.ToString());
        }

        // Batch fetch all required Redis items (performance optimization)
        var outputItemsCache = await Points.GetRawItemsBatch(allOutputIds.ToList());

        MyLog.Debug("Batch fetched Redis items for Schedule processing", new Dictionary<string, object?>
        {
            ["MemoryCount"] = memoriesToProcess.Count,
            ["OutputItemsRequested"] = allOutputIds.Count,
            ["OutputItemsFetched"] = outputItemsCache.Count
        });

        // Process each memory
        foreach (var memory in memoriesToProcess)
        {
            try
            {
                await ProcessSingleSchedule(memory, outputItemsCache, epochTime, utcNow);
                _lastExecutionTimes[memory.Id] = epochTime;
            }
            catch (Exception ex)
            {
                MyLog.Error($"Failed to process ScheduleMemory {memory.Id}", ex, new Dictionary<string, object?>
                {
                    ["MemoryId"] = memory.Id,
                    ["MemoryName"] = memory.Name
                });
            }
        }
    }

    private async Task ProcessSingleSchedule(
        ScheduleMemory memory,
        Dictionary<string, RawItemRedis> outputItemsCache,
        long epochTime,
        DateTime utcNow)
    {
        var outputKey = memory.OutputItemId.ToString();
        
        // Check if output item exists in cache
        if (!outputItemsCache.ContainsKey(outputKey))
        {
            MyLog.Warning("Output item not found in cache", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["OutputItemId"] = memory.OutputItemId
            });
            return;
        }

        // Determine if output is analog based on what default value is set
        // If DefaultAnalogValue is set, it's analog output; otherwise digital
        bool isAnalogOutput = memory.DefaultAnalogValue.HasValue;

        // Check and handle manual override
        if (memory.ManualOverrideActive)
        {
            bool overrideExpired = await CheckOverrideExpiration(memory, utcNow);
            
            if (!overrideExpired)
            {
                // Override is active - write override value
                await WriteOverrideValue(memory, isAnalogOutput, epochTime);
                return;
            }
        }

        // Check if today is a holiday
        var (isHoliday, holidayDate) = await CheckHoliday(memory, utcNow);
        if (isHoliday)
        {
            // Write holiday value or default value
            await WriteHolidayValue(memory, holidayDate, isAnalogOutput, epochTime);
            return;
        }

        // Find active schedule block for current day and time
        var activeBlock = FindActiveBlock(memory, utcNow);
        
        if (activeBlock != null)
        {
            // Write scheduled value
            await WriteScheduledValue(memory, activeBlock, isAnalogOutput, epochTime);
            
            // Update last active block for event-based override detection
            if (memory.LastActiveBlockId != activeBlock.Id)
            {
                memory.LastActiveBlockId = activeBlock.Id;
                await _context!.SaveChangesAsync();
            }
        }
        else
        {
            // No active block - write default value
            await WriteDefaultValue(memory, isAnalogOutput, epochTime);
            
            // Clear last active block
            if (memory.LastActiveBlockId.HasValue)
            {
                memory.LastActiveBlockId = null;
                await _context!.SaveChangesAsync();
            }
        }
    }

    /// <summary>
    /// Check if manual override has expired and clear it if needed
    /// </summary>
    private async Task<bool> CheckOverrideExpiration(ScheduleMemory memory, DateTime utcNow)
    {
        if (memory.OverrideExpirationMode == OverrideExpirationMode.TimeBased)
        {
            // Time-based expiration: check if duration has passed
            if (memory.OverrideActivationTime.HasValue)
            {
                var expirationTime = memory.OverrideActivationTime.Value.AddMinutes(memory.OverrideDurationMinutes);
                if (utcNow >= expirationTime)
                {
                    // Override expired - clear it
                    await ClearManualOverride(memory);
                    MyLog.Info("Schedule override expired (time-based)", new Dictionary<string, object?>
                    {
                        ["MemoryId"] = memory.Id,
                        ["MemoryName"] = memory.Name,
                        ["ActivationTime"] = memory.OverrideActivationTime,
                        ["Duration"] = memory.OverrideDurationMinutes
                    });
                    return true;
                }
            }
        }
        else // EventBased
        {
            // Event-based expiration: check if active block has changed
            var currentActiveBlock = FindActiveBlock(memory, utcNow);
            var currentBlockId = currentActiveBlock?.Id;
            
            if (currentBlockId != memory.LastActiveBlockId)
            {
                // Schedule changed - clear override
                await ClearManualOverride(memory);
                MyLog.Info("Schedule override expired (event-based - schedule changed)", new Dictionary<string, object?>
                {
                    ["MemoryId"] = memory.Id,
                    ["MemoryName"] = memory.Name,
                    ["PreviousBlockId"] = memory.LastActiveBlockId,
                    ["CurrentBlockId"] = currentBlockId
                });
                return true;
            }
        }

        return false; // Override still active
    }

    /// <summary>
    /// Clear manual override state
    /// </summary>
    private async Task ClearManualOverride(ScheduleMemory memory)
    {
        memory.ManualOverrideActive = false;
        memory.OverrideActivationTime = null;
        memory.ManualOverrideAnalogValue = null;
        memory.ManualOverrideDigitalValue = null;
        await _context!.SaveChangesAsync();
    }

    /// <summary>
    /// Check if today is a holiday in the associated calendar
    /// </summary>
    private async Task<(bool IsHoliday, HolidayDate? HolidayDate)> CheckHoliday(ScheduleMemory memory, DateTime utcNow)
    {
        if (!memory.HolidayCalendarId.HasValue || memory.HolidayCalendar?.Dates == null)
        {
            return (false, null);
        }

        var todayDate = utcNow.Date;
        var holidayDate = memory.HolidayCalendar.Dates
            .FirstOrDefault(d => d.Date.Date == todayDate);

        return (holidayDate != null, holidayDate);
    }

    /// <summary>
    /// Find the active schedule block for current day and time
    /// Uses priority to resolve conflicts when multiple blocks match
    /// </summary>
    private ScheduleBlock? FindActiveBlock(ScheduleMemory memory, DateTime utcNow)
    {
        if (memory.ScheduleBlocks == null || memory.ScheduleBlocks.Count == 0)
        {
            return null;
        }

        var currentDayOfWeek = (ScheduleDayOfWeek)utcNow.DayOfWeek;
        var currentTime = utcNow.TimeOfDay;

        // Find all blocks that match current day and time
        var matchingBlocks = memory.ScheduleBlocks
            .Where(b => b.DayOfWeek == currentDayOfWeek &&
                       b.StartTime <= currentTime &&
                       b.EndTime > currentTime)
            .ToList();

        if (matchingBlocks.Count == 0)
        {
            return null;
        }

        // Return the highest priority block
        return matchingBlocks.OrderByDescending(b => b.Priority).First();
    }

    /// <summary>
    /// Write manual override value to output
    /// </summary>
    private async Task WriteOverrideValue(ScheduleMemory memory, bool isAnalogOutput, long epochTime)
    {
        string value;
        if (isAnalogOutput)
        {
            value = memory.ManualOverrideAnalogValue?.ToString() ?? "0";
        }
        else
        {
            value = memory.ManualOverrideDigitalValue == true ? "1" : "0";
        }

        await Points.WriteValueToController(memory.OutputItemId, value, epochTime);
        
        MyLog.Debug("Schedule override value written", new Dictionary<string, object?>
        {
            ["MemoryId"] = memory.Id,
            ["Value"] = value,
            ["IsAnalog"] = isAnalogOutput
        });
    }

    /// <summary>
    /// Write holiday value to output
    /// </summary>
    private async Task WriteHolidayValue(ScheduleMemory memory, HolidayDate? holidayDate, bool isAnalogOutput, long epochTime)
    {
        string value;
        
        // Check if holiday has specific value, otherwise use default
        if (isAnalogOutput)
        {
            var holidayValue = holidayDate?.HolidayAnalogValue ?? memory.DefaultAnalogValue;
            value = holidayValue?.ToString() ?? "0";
        }
        else
        {
            var holidayValue = holidayDate?.HolidayDigitalValue ?? memory.DefaultDigitalValue;
            value = holidayValue == true ? "1" : "0";
        }

        await Points.WriteValueToController(memory.OutputItemId, value, epochTime);
        
        MyLog.Debug("Schedule holiday value written", new Dictionary<string, object?>
        {
            ["MemoryId"] = memory.Id,
            ["HolidayName"] = holidayDate?.Name,
            ["Value"] = value,
            ["IsAnalog"] = isAnalogOutput
        });
    }

    /// <summary>
    /// Write scheduled block value to output
    /// </summary>
    private async Task WriteScheduledValue(ScheduleMemory memory, ScheduleBlock block, bool isAnalogOutput, long epochTime)
    {
        string value;
        if (isAnalogOutput)
        {
            value = block.AnalogOutputValue?.ToString() ?? "0";
        }
        else
        {
            value = block.DigitalOutputValue == true ? "1" : "0";
        }

        await Points.WriteValueToController(memory.OutputItemId, value, epochTime);
        
        MyLog.Debug("Schedule block value written", new Dictionary<string, object?>
        {
            ["MemoryId"] = memory.Id,
            ["BlockId"] = block.Id,
            ["BlockDescription"] = block.Description,
            ["Value"] = value,
            ["IsAnalog"] = isAnalogOutput
        });
    }

    /// <summary>
    /// Write default value to output (no active block)
    /// </summary>
    private async Task WriteDefaultValue(ScheduleMemory memory, bool isAnalogOutput, long epochTime)
    {
        string value;
        if (isAnalogOutput)
        {
            value = memory.DefaultAnalogValue?.ToString() ?? "0";
        }
        else
        {
            value = memory.DefaultDigitalValue == true ? "1" : "0";
        }

        await Points.WriteValueToController(memory.OutputItemId, value, epochTime);
        
        MyLog.Debug("Schedule default value written", new Dictionary<string, object?>
        {
            ["MemoryId"] = memory.Id,
            ["Value"] = value,
            ["IsAnalog"] = isAnalogOutput
        });
    }
}
