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
    
    // Store active stream writers for each stream type
    private static readonly ConcurrentDictionary<string, IServerStreamWriter<ActiveAlarmsUpdate>> _activeAlarmStreams = new();
    private static readonly ConcurrentDictionary<string, IServerStreamWriter<MessageUpdate>> _messageStreams = new();
    private static readonly ConcurrentDictionary<string, IServerStreamWriter<VersionUpdate>> _versionStreams = new();

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
    /// Register a message stream writer
    /// </summary>
    public void RegisterMessageStream(string clientId, IServerStreamWriter<MessageUpdate> stream)
    {
        _messageStreams.TryAdd(clientId, stream);
        _logger.LogInformation("Registered message stream for client: {ClientId}", clientId);
    }

    /// <summary>
    /// Unregister a message stream writer
    /// </summary>
    public void UnregisterMessageStream(string clientId)
    {
        if (_messageStreams.TryRemove(clientId, out _))
        {
            _logger.LogInformation("Unregistered message stream for client: {ClientId}", clientId);
        }
    }

    /// <summary>
    /// Register a version update stream writer
    /// </summary>
    public void RegisterVersionStream(string clientId, IServerStreamWriter<VersionUpdate> stream)
    {
        _versionStreams.TryAdd(clientId, stream);
        _logger.LogInformation("Registered version stream for client: {ClientId}", clientId);
    }

    /// <summary>
    /// Unregister a version update stream writer
    /// </summary>
    public void UnregisterVersionStream(string clientId)
    {
        if (_versionStreams.TryRemove(clientId, out _))
        {
            _logger.LogInformation("Unregistered version stream for client: {ClientId}", clientId);
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
    /// Broadcast message to all connected clients
    /// </summary>
    public async Task BroadcastMessageAsync(string user, string message, CancellationToken cancellationToken = default)
    {
        if (_messageStreams.IsEmpty)
        {
            return;
        }

        var update = new MessageUpdate
        {
            User = user,
            Message = message,
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
        };

        var tasks = new List<Task>();
        var failedClients = new List<string>();

        foreach (var (clientId, stream) in _messageStreams)
        {
            tasks.Add(Task.Run(async () =>
            {
                try
                {
                    await stream.WriteAsync(update, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send message to client: {ClientId}", clientId);
                    failedClients.Add(clientId);
                }
            }, cancellationToken));
        }

        await Task.WhenAll(tasks);

        // Remove failed clients
        foreach (var clientId in failedClients)
        {
            UnregisterMessageStream(clientId);
        }

        _logger.LogDebug("Broadcasted message to {Count} clients", _messageStreams.Count);
    }

    /// <summary>
    /// Broadcast version update to all connected clients
    /// </summary>
    public async Task BroadcastVersionUpdateAsync(int systemVersion, string message, CancellationToken cancellationToken = default)
    {
        if (_versionStreams.IsEmpty)
        {
            return;
        }

        var update = new VersionUpdate
        {
            SystemVersion = systemVersion,
            Message = message,
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
        };

        var tasks = new List<Task>();
        var failedClients = new List<string>();

        foreach (var (clientId, stream) in _versionStreams)
        {
            tasks.Add(Task.Run(async () =>
            {
                try
                {
                    await stream.WriteAsync(update, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send version update to client: {ClientId}", clientId);
                    failedClients.Add(clientId);
                }
            }, cancellationToken));
        }

        await Task.WhenAll(tasks);

        // Remove failed clients
        foreach (var clientId in failedClients)
        {
            UnregisterVersionStream(clientId);
        }

        _logger.LogDebug("Broadcasted version update to {Count} clients", _versionStreams.Count);
    }

    /// <summary>
    /// Get count of connected clients for each stream type
    /// </summary>
    public (int ActiveAlarms, int Messages, int Versions) GetConnectedClientCounts()
    {
        return (_activeAlarmStreams.Count, _messageStreams.Count, _versionStreams.Count);
    }
}
