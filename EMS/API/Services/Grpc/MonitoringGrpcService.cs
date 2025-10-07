using API.Grpc;
using Core.Models;
using Grpc.Core;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;

namespace API.Services.Grpc;

/// <summary>
/// gRPC service for real-time monitoring updates via server streaming
/// </summary>
[Authorize]
public class MonitoringGrpcService : MonitoringService.MonitoringServiceBase
{
    private readonly ILogger<MonitoringGrpcService> _logger;
    private static readonly ConcurrentDictionary<string, List<ActiveAlarm>?> _activeAlarmsCache = new();
    private static byte[]? _lastActiveAlarmsDigest;

    /// <summary>
    /// Initializes a new instance of the MonitoringGrpcService
    /// </summary>
    /// <param name="logger">Logger instance for structured logging</param>
    public MonitoringGrpcService(ILogger<MonitoringGrpcService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Server streaming endpoint for active alarms count updates
    /// </summary>
    /// <param name="request">Active alarms request containing client ID</param>
    /// <param name="responseStream">Response stream for sending updates</param>
    /// <param name="context">Server call context</param>
    public override async Task StreamActiveAlarms(
        ActiveAlarmsRequest request,
        IServerStreamWriter<ActiveAlarmsUpdate> responseStream,
        ServerCallContext context)
    {
        const string operation = nameof(StreamActiveAlarms);
        var clientId = request.ClientId ?? "unknown";
        
        _logger.LogInformation("{Operation} started for client: {ClientId}", operation, clientId);

        try
        {
            // Initialize client cache
            _activeAlarmsCache.TryAdd(clientId, null);

            while (!context.CancellationToken.IsCancellationRequested)
            {
                try
                {
                    // Get active alarms
                    var alarms = await Core.Alarms.ActiveAlarms();
                    var currentDigest = ComputeDigest(alarms);

                    // Check if alarms changed since last broadcast
                    bool hasChanged = _lastActiveAlarmsDigest == null || 
                                     !currentDigest.SequenceEqual(_lastActiveAlarmsDigest);

                    if (hasChanged)
                    {
                        _lastActiveAlarmsDigest = currentDigest;
                        _activeAlarmsCache[clientId] = alarms;

                        var update = new ActiveAlarmsUpdate
                        {
                            AlarmCount = alarms.Count,
                            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
                        };

                        _logger.LogInformation("Broadcasting active alarms update. Count: {Count}", alarms.Count);
                        await responseStream.WriteAsync(update, context.CancellationToken);
                    }

                    // Wait before next check
                    await Task.Delay(TimeSpan.FromSeconds(1), context.CancellationToken);
                }
                catch (OperationCanceledException) when (context.CancellationToken.IsCancellationRequested)
                {
                    _logger.LogDebug("{Operation} cancellation requested for client: {ClientId}", operation, clientId);
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error polling active alarms for client: {ClientId}", clientId);
                    await Task.Delay(TimeSpan.FromSeconds(5), context.CancellationToken);
                }
            }
        }
        finally
        {
            // Clean up client cache
            _activeAlarmsCache.TryRemove(clientId, out _);
            _logger.LogInformation("{Operation} stopped for client: {ClientId}", operation, clientId);
        }
    }

    /// <summary>
    /// Computes a SHA256 digest of active alarms for change detection
    /// </summary>
    /// <param name="activeAlarms">List of active alarms</param>
    /// <returns>SHA256 hash as byte array</returns>
    private static byte[] ComputeDigest(List<ActiveAlarm> activeAlarms)
    {
        if (activeAlarms == null || activeAlarms.Count == 0)
        {
            return Array.Empty<byte>();
        }

        var sb = new StringBuilder(activeAlarms.Count * 16);
        foreach (var alarm in activeAlarms)
        {
            sb.Append(alarm.Id);
            sb.Append('|');
        }

        using var sha = SHA256.Create();
        return sha.ComputeHash(Encoding.UTF8.GetBytes(sb.ToString()));
    }
}
