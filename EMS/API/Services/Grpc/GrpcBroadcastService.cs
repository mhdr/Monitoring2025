using API.Grpc;
using System.Collections.Concurrent;
using Grpc.Core;

namespace API.Services.Grpc;

/// <summary>
/// Service for broadcasting updates to all connected gRPC streaming clients
/// Replaces SignalR IHubContext functionality
/// </summary>
public class GrpcBroadcastService
{
    private readonly ILogger<GrpcBroadcastService> _logger;
    
    // Store active stream writers for active alarms
    private static readonly ConcurrentDictionary<string, IServerStreamWriter<ActiveAlarmsUpdate>> _activeAlarmStreams = new();

    /// <summary>
    /// Initializes a new instance of the GrpcBroadcastService
    /// </summary>
    /// <param name="logger">Logger instance</param>
    public GrpcBroadcastService(ILogger<GrpcBroadcastService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Register an active alarms stream writer
    /// </summary>
    public void RegisterActiveAlarmsStream(string clientId, IServerStreamWriter<ActiveAlarmsUpdate> stream)
    {
        _activeAlarmStreams.TryAdd(clientId, stream);
        _logger.LogInformation("Registered active alarms stream for client: {ClientId}", clientId);
    }

    /// <summary>
    /// Unregister an active alarms stream writer
    /// </summary>
    public void UnregisterActiveAlarmsStream(string clientId)
    {
        if (_activeAlarmStreams.TryRemove(clientId, out _))
        {
            _logger.LogInformation("Unregistered active alarms stream for client: {ClientId}", clientId);
        }
    }

    /// <summary>
    /// Broadcast active alarms update to all connected clients
    /// </summary>
    public async Task BroadcastActiveAlarmsAsync(int alarmCount, CancellationToken cancellationToken = default)
    {
        if (_activeAlarmStreams.IsEmpty)
        {
            return;
        }

        var update = new ActiveAlarmsUpdate
        {
            AlarmCount = alarmCount,
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
        };

        var tasks = new List<Task>();
        var failedClients = new List<string>();

        foreach (var (clientId, stream) in _activeAlarmStreams)
        {
            tasks.Add(Task.Run(async () =>
            {
                try
                {
                    await stream.WriteAsync(update, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send update to client: {ClientId}", clientId);
                    failedClients.Add(clientId);
                }
            }, cancellationToken));
        }

        await Task.WhenAll(tasks);

        // Remove failed clients
        foreach (var clientId in failedClients)
        {
            UnregisterActiveAlarmsStream(clientId);
        }

        _logger.LogDebug("Broadcasted active alarms update to {Count} clients. AlarmCount: {AlarmCount}",
            _activeAlarmStreams.Count, alarmCount);
    }

    /// <summary>
    /// Get count of connected clients
    /// </summary>
    public int GetConnectedClientCount()
    {
        return _activeAlarmStreams.Count;
    }
}
