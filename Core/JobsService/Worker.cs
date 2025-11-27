using System.Runtime.InteropServices;
using Core;
using Core.Libs;
using Core.Models;
using Cronos;
using Microsoft.EntityFrameworkCore;

namespace JobsService;

public class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;
    private DataContext _context;

    public Worker(ILogger<Worker> logger)
    {
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                _context = new DataContext();
                var triggers = await FindActiveTriggers();
                MyLog.LogJson(triggers);

                foreach (var trigger in triggers)
                {
                    try
                    {
                        var jobDetails = await _context.JobDetails.Where(x => x.TriggerId == trigger.Id)
                            .ToListAsync();

                        foreach (var jobDetail in jobDetails)
                        {
                            await Points.WriteOrAddValue(jobDetail.ItemId, jobDetail.Value);
                            MyLog.LogJson("Trigger",trigger);
                        }
                    }
                    catch (Exception e2)
                    {
                        MyLog.LogJson(e2);
                    }
                }

                await _context.DisposeAsync();
                await Task.Delay(1000 * 10, stoppingToken);
            }
            catch (Exception e)
            {
                MyLog.LogJson(e);
            }
        }
    }

    private DateTime GetTime()
    {
        // Get current UTC time
        DateTime utcNow = DateTime.UtcNow;

        // Find the Tehran time zone
        TimeZoneInfo tehranTimeZone = GetTimeZoneInfo();

        // Convert UTC time to Tehran time
        DateTime tehranTime = TimeZoneInfo.ConvertTimeFromUtc(utcNow, tehranTimeZone);

        return tehranTime;
    }

    private TimeZoneInfo GetTimeZoneInfo()
    {
        // Determine the correct time zone ID
        string timeZoneId = RuntimeInformation.IsOSPlatform(OSPlatform.Windows)
            ? "Iran Standard Time" // Windows time zone ID
            : "Asia/Tehran"; // Linux/macOS time zone ID

        // Find the Tehran time zone
        TimeZoneInfo tehranTimeZone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);

        return tehranTimeZone;
    }

    private async Task<List<Trigger>> FindActiveTriggers()
    {
        List<Trigger> result = new List<Trigger>();

        try
        {

            var now = DateTimeOffset.Now;
            var todayMidnight = new DateTimeOffset(now.Date, now.Offset);

            var triggers = await _context.Triggers.ToListAsync();

            foreach (var trigger in triggers)
            {
                if (trigger.IsDisabled)
                {
                    continue;
                }
                
                var cronExpressionStart = CronExpression.Parse(trigger.StartTime);
                var cronExpressionEnd = CronExpression.Parse(trigger.EndTime);

                var startTimeOccurrence = cronExpressionStart.GetNextOccurrence(todayMidnight,TimeZoneInfo.Local);
                var endTimeOccurrence = cronExpressionEnd.GetNextOccurrence(todayMidnight,TimeZoneInfo.Local);

                bool isNowBetween = startTimeOccurrence <= now && now <= endTimeOccurrence;

                if (isNowBetween)
                {
                    result.Add(trigger);
                }
            }
        }
        catch (Exception e)
        {
            MyLog.LogJson(e);
        }

        return result;
    }
}