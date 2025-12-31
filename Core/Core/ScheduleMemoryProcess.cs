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
        }
        else
        {
            // No active block - write default value
            await WriteDefaultValue(memory, isAnalogOutput, epochTime);
        }
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
    /// Handles: null EndTime, cross-midnight blocks, priority resolution
    /// </summary>
    private ScheduleBlock? FindActiveBlock(ScheduleMemory memory, DateTime utcNow)
    {
        if (memory.ScheduleBlocks == null || memory.ScheduleBlocks.Count == 0)
        {
            return null;
        }

        var currentDayOfWeek = (ScheduleDayOfWeek)utcNow.DayOfWeek;
        var currentTime = utcNow.TimeOfDay;
        var previousDay = (ScheduleDayOfWeek)(((int)currentDayOfWeek + 6) % 7);
        
        var matchingBlocks = new List<ScheduleBlock>();
        
        // Check blocks on current day
        foreach (var block in memory.ScheduleBlocks.Where(b => b.DayOfWeek == currentDayOfWeek))
        {
            if (block.EndTime.HasValue)
            {
                if (block.StartTime < block.EndTime.Value)
                {
                    // Normal block (doesn't cross midnight)
                    if (currentTime >= block.StartTime && currentTime < block.EndTime.Value)
                    {
                        matchingBlocks.Add(block);
                    }
                }
                else
                {
                    // Cross-midnight block on current day (we're in the "before midnight" portion)
                    if (currentTime >= block.StartTime)
                    {
                        matchingBlocks.Add(block);
                    }
                }
            }
            else
            {
                // Null EndTime - handle based on behavior
                if (block.NullEndTimeBehavior == NullEndTimeBehavior.ExtendToEndOfDay)
                {
                    // Active from StartTime until end of day
                    if (currentTime >= block.StartTime)
                    {
                        matchingBlocks.Add(block);
                    }
                }
                else // UseDefault
                {
                    // Not active (immediate end - uses default value)
                    // No match added
                }
            }
        }
        
        // Check blocks from previous day that cross midnight (we're in the "after midnight" portion)
        foreach (var block in memory.ScheduleBlocks.Where(b => b.DayOfWeek == previousDay && b.EndTime.HasValue))
        {
            if (block.StartTime > block.EndTime.Value)
            {
                // Cross-midnight block from previous day
                if (currentTime < block.EndTime.Value)
                {
                    matchingBlocks.Add(block);
                }
            }
        }

        if (matchingBlocks.Count == 0)
        {
            return null;
        }

        // Return highest priority block, then earliest start time for tie-breaking
        return matchingBlocks
            .OrderByDescending(b => b.Priority)
            .ThenBy(b => b.StartTime)
            .First();
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

        await Points.WriteOrAddValue(memory.OutputItemId, value, null, memory.Duration);
        
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

        await Points.WriteOrAddValue(memory.OutputItemId, value, null, memory.Duration);
        
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

        await Points.WriteOrAddValue(memory.OutputItemId, value, null, memory.Duration);
        
        MyLog.Debug("Schedule default value written", new Dictionary<string, object?>
        {
            ["MemoryId"] = memory.Id,
            ["Value"] = value,
            ["IsAnalog"] = isAnalogOutput
        });
    }
}
