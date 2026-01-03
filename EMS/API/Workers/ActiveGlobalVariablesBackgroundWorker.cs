using System.Security.Cryptography;
using System.Text;
using API.Services;
using Core;
using Core.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace API.Workers;

/// <summary>
/// Background worker that polls global variables and notifies connected SignalR clients when values change.
/// Uses BackgroundService for proper cancellation and lifecycle management.
/// </summary>
public class ActiveGlobalVariablesBackgroundWorker : BackgroundService, IDisposable
{
    private readonly SignalRBroadcastService _signalRBroadcastService;
    private readonly ILogger<ActiveGlobalVariablesBackgroundWorker> _logger;
    private List<(GlobalVariable Config, string CurrentValue, long LastUpdateTime)>? _previousVariables;
    private bool _disposed;

    /// <summary>
    /// Create a new ActiveGlobalVariablesBackgroundWorker.
    /// </summary>
    /// <param name="signalRBroadcastService">SignalR broadcast service used to broadcast messages to connected clients.</param>
    /// <param name="logger">Logger instance for structured logging.</param>
    public ActiveGlobalVariablesBackgroundWorker(SignalRBroadcastService signalRBroadcastService, ILogger<ActiveGlobalVariablesBackgroundWorker> logger)
    {
        _signalRBroadcastService = signalRBroadcastService ?? throw new ArgumentNullException(nameof(signalRBroadcastService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Main background loop. Runs until the host cancellation token is signaled.
    /// Polls every 2 seconds for global variable value changes.
    /// </summary>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ActiveGlobalVariablesBackgroundWorker starting.");

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var variables = await GetGlobalVariablesIfChanged(stoppingToken);

                    if (variables != null)
                    {
                        _logger.LogInformation("Global variable values changed. Broadcasting to online users. Total variables: {count}", variables.Count);
                        // Broadcast to SignalR clients
                        await _signalRBroadcastService.BroadcastGlobalVariablesUpdateAsync(variables, stoppingToken);
                    }

                    await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    // expected during shutdown - swallow to allow graceful exit
                    _logger.LogDebug("ActiveGlobalVariablesBackgroundWorker cancellation requested.");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error while polling global variables.");
                }
            }
        }
        finally
        {
            _logger.LogInformation("ActiveGlobalVariablesBackgroundWorker stopping.");
        }
    }

    private async Task<List<(GlobalVariable Config, string CurrentValue, long LastUpdateTime)>?> GetGlobalVariablesIfChanged(CancellationToken cancellationToken)
    {
        var variables = await Points.GetAllGlobalVariablesWithValues();

        if (_previousVariables == null)
        {
            _previousVariables = variables;
            return variables;
        }

        // Compare using a hash of all variable values
        var currentDigest = ComputeDigest(variables);
        var prevDigest = ComputeDigest(_previousVariables);

        if (!currentDigest.SequenceEqual(prevDigest))
        {
            _previousVariables = variables;
            return variables;
        }

        return null;
    }

    private static byte[] ComputeDigest(List<(GlobalVariable Config, string CurrentValue, long LastUpdateTime)> variables)
    {
        // Use a stable SHA256 digest over concatenated IDs and values to detect changes.
        if (variables == null || variables.Count == 0)
            return Array.Empty<byte>();

        using var sha256 = SHA256.Create();
        var sb = new StringBuilder();
        foreach (var (config, currentValue, lastUpdateTime) in variables.OrderBy(v => v.Config.Id))
        {
            sb.Append(config.Id);
            sb.Append(':');
            sb.Append(currentValue);
            sb.Append(':');
            sb.Append(lastUpdateTime);
            sb.Append('|');
        }

        return sha256.ComputeHash(Encoding.UTF8.GetBytes(sb.ToString()));
    }

    /// <summary>
    /// Dispose resources.
    /// </summary>
    public new void Dispose()
    {
        if (_disposed)
            return;

        _disposed = true;
        base.Dispose();
    }
}
