using System.Security.Cryptography;
using System.Text;
using API.Libs;
using Core.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace API.Workers;

/// <summary>
/// Background worker that polls active alarms and notifies connected SignalR clients when the set changes.
/// Uses BackgroundService for proper cancellation and lifecycle management.
/// </summary>
public class ActiveAlarmsBackgroundWorker : BackgroundService, IDisposable
{
    private readonly IHubContext<MyHub> _hubContext;
    private readonly ILogger<ActiveAlarmsBackgroundWorker> _logger;
    private List<ActiveAlarm>? _activeAlarms;
    private bool _disposed;

    /// <summary>
    /// Create a new ActiveAlarmsBackgroundWorker.
    /// </summary>
    /// <param name="hubContext">SignalR hub context used to broadcast messages.</param>
    /// <param name="logger">Logger instance for structured logging.</param>
    public ActiveAlarmsBackgroundWorker(IHubContext<MyHub> hubContext, ILogger<ActiveAlarmsBackgroundWorker> logger)
    {
        _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Main background loop. Runs until the host cancellation token is signaled.
    /// </summary>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ActiveAlarmsBackgroundWorker starting.");

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var alarms = await GetActiveAlarmsIfChanged(stoppingToken);

                    if (alarms != null)
                    {
                        _logger.LogInformation("Active alarms changed. Broadcasting count={count}", alarms.Count);
                        // send count as integer; clients should expect an integer
                        await _hubContext.Clients.All.SendAsync("ActiveAlarms", alarms.Count, stoppingToken);
                    }

                    await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    // expected during shutdown - swallow to allow graceful exit
                    _logger.LogDebug("ActiveAlarmsBackgroundWorker cancellation requested.");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error while polling active alarms.");
                }
            }
        }
        finally
        {
            _logger.LogInformation("ActiveAlarmsBackgroundWorker stopping.");
        }
    }

    private async Task<List<ActiveAlarm>?> GetActiveAlarmsIfChanged(CancellationToken cancellationToken)
    {
        // Core.Alarms.ActiveAlarms() is assumed to be an async call that honors cancellation via token if available.
        var alarms = await Core.Alarms.ActiveAlarms();

        if (_activeAlarms == null)
        {
            _activeAlarms = alarms;
            return alarms;
        }

        var currentDigest = ComputeDigest(alarms);
        var prevDigest = ComputeDigest(_activeAlarms);

        if (!currentDigest.SequenceEqual(prevDigest))
        {
            _activeAlarms = alarms;
            return alarms;
        }

        return null;
    }

    private static byte[] ComputeDigest(List<ActiveAlarm> activeAlarms)
    {
        // Use a stable SHA256 digest over concatenated Ids to detect changes.
        // This avoids building large strings and provides a compact comparison.
        if (activeAlarms == null || activeAlarms.Count == 0)
        {
            return Array.Empty<byte>();
        }

        var sb = new StringBuilder(activeAlarms.Count * 16);
        foreach (var a in activeAlarms)
        {
            sb.Append(a.Id);
            sb.Append('|');
        }

        using var sha = SHA256.Create();
        return sha.ComputeHash(Encoding.UTF8.GetBytes(sb.ToString()));
    }

    /// <summary>
    /// Dispose managed resources.
    /// </summary>
    public override void Dispose()
    {
        if (_disposed) return;

        _activeAlarms = null;
        _disposed = true;

        base.Dispose();
    }
}