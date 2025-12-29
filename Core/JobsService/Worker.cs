using System.Runtime.InteropServices;
using Core;
using Core.Libs;
using Core.Models;
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
                // Job triggers functionality has been removed
                // This service is no longer functional
                _logger.LogWarning("JobsService is disabled - JobDetail and Trigger functionality has been removed from the system");
                
                await _context.DisposeAsync();
                await Task.Delay(1000 * 60, stoppingToken); // Wait 60 seconds before logging again
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
}
