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
    /// Server streaming endpoint for general messages
    /// </summary>
    /// <param name="request">Message request containing client ID</param>
    /// <param name="responseStream">Response stream for sending messages</param>
    /// <param name="context">Server call context</param>
    public override async Task StreamMessages(
        MessageRequest request,
        IServerStreamWriter<MessageUpdate> responseStream,
        ServerCallContext context)
    {
        const string operation = nameof(StreamMessages);
        var clientId = request.ClientId ?? "unknown";
        
        _logger.LogInformation("{Operation} started for client: {ClientId}", operation, clientId);

        try
        {
            // Keep connection alive while client is connected
            while (!context.CancellationToken.IsCancellationRequested)
            {
                await Task.Delay(TimeSpan.FromSeconds(30), context.CancellationToken);
            }
        }
        catch (OperationCanceledException) when (context.CancellationToken.IsCancellationRequested)
        {
            _logger.LogDebug("{Operation} cancellation requested for client: {ClientId}", operation, clientId);
        }
        finally
        {
            _logger.LogInformation("{Operation} stopped for client: {ClientId}", operation, clientId);
        }
    }

    /// <summary>
    /// Server streaming endpoint for system version updates
    /// </summary>
    /// <param name="request">Version update request containing client ID</param>
    /// <param name="responseStream">Response stream for sending version updates</param>
    /// <param name="context">Server call context</param>
    public override async Task StreamVersionUpdates(
        VersionUpdateRequest request,
        IServerStreamWriter<VersionUpdate> responseStream,
        ServerCallContext context)
    {
        const string operation = nameof(StreamVersionUpdates);
        var clientId = request.ClientId ?? "unknown";
        
        _logger.LogInformation("{Operation} started for client: {ClientId}", operation, clientId);

        try
        {
            // Keep connection alive while client is connected
            while (!context.CancellationToken.IsCancellationRequested)
            {
                await Task.Delay(TimeSpan.FromSeconds(30), context.CancellationToken);
            }
        }
        catch (OperationCanceledException) when (context.CancellationToken.IsCancellationRequested)
        {
            _logger.LogDebug("{Operation} cancellation requested for client: {ClientId}", operation, clientId);
        }
        finally
        {
            _logger.LogInformation("{Operation} stopped for client: {ClientId}", operation, clientId);
        }
    }

    /// <summary>
    /// Unary method to send a message to all connected clients
    /// </summary>
    /// <param name="request">Send message request containing user and message</param>
    /// <param name="context">Server call context</param>
    /// <returns>Send message response indicating success or failure</returns>
    public override Task<SendMessageResponse> SendMessage(SendMessageRequest request, ServerCallContext context)
    {
        const string operation = nameof(SendMessage);
        _logger.LogInformation("{Operation} called. User: {User}, Message: {Message}", 
            operation, request.User, request.Message);

        try
        {
            // This is a placeholder for broadcasting messages
            // In a real implementation, you would notify all connected StreamMessages clients
            
            return Task.FromResult(new SendMessageResponse
            {
                Success = true,
                ErrorMessage = string.Empty
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in {Operation}", operation);
            return Task.FromResult(new SendMessageResponse
            {
                Success = false,
                ErrorMessage = ex.Message
            });
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
