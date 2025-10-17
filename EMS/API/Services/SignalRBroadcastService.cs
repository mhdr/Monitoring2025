using API.Hubs;
using API.Models.Dto;
using Microsoft.AspNetCore.SignalR;

namespace API.Services;

/// <summary>
/// Service for broadcasting real-time updates to SignalR clients
/// </summary>
public class SignalRBroadcastService
{
    private readonly IHubContext<MonitoringHub> _hubContext;
    private readonly ILogger<SignalRBroadcastService> _logger;

    /// <summary>
    /// Initializes a new instance of the SignalRBroadcastService
    /// </summary>
    /// <param name="hubContext">SignalR hub context for MonitoringHub</param>
    /// <param name="logger">Logger instance for structured logging</param>
    public SignalRBroadcastService(
        IHubContext<MonitoringHub> hubContext,
        ILogger<SignalRBroadcastService> logger)
    {
        _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Broadcasts active alarms update to all connected SignalR clients
    /// </summary>
    /// <param name="request">Request containing alarm count and timestamp</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Response indicating success and number of clients notified</returns>
    /// <exception cref="ArgumentNullException">Thrown when request is null</exception>
    public async Task<BroadcastActiveAlarmsResponseDto> BroadcastActiveAlarmsUpdateAsync(
        BroadcastActiveAlarmsRequestDto request,
        CancellationToken cancellationToken = default)
    {
        const string operation = nameof(BroadcastActiveAlarmsUpdateAsync);

        if (request == null)
        {
            throw new ArgumentNullException(nameof(request));
        }

        try
        {
            _logger.LogInformation(
                "{Operation}: Broadcasting active alarms update. AlarmCount: {AlarmCount}, Timestamp: {Timestamp}",
                operation, request.AlarmCount, request.Timestamp);

            // Broadcast to all connected clients
            await _hubContext.Clients.All.SendAsync(
                "ReceiveActiveAlarmsUpdate",
                new
                {
                    alarmCount = request.AlarmCount,
                    timestamp = request.Timestamp
                },
                cancellationToken);

            _logger.LogDebug("{Operation}: Successfully broadcasted active alarms update", operation);

            return new BroadcastActiveAlarmsResponseDto
            {
                Success = true,
                ClientCount = 0, // SignalR doesn't provide connected client count easily
                ErrorMessage = null
            };
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning("{Operation}: Broadcast cancelled", operation);
            
            return new BroadcastActiveAlarmsResponseDto
            {
                Success = false,
                ClientCount = 0,
                ErrorMessage = "Broadcast cancelled"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "{Operation}: Error broadcasting active alarms update", operation);
            
            return new BroadcastActiveAlarmsResponseDto
            {
                Success = false,
                ClientCount = 0,
                ErrorMessage = ex.Message
            };
        }
    }

    /// <summary>
    /// Broadcasts active alarms update to all connected SignalR clients (simplified version)
    /// </summary>
    /// <param name="alarmCount">Number of active alarms</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Response indicating success and number of clients notified</returns>
    public async Task<BroadcastActiveAlarmsResponseDto> BroadcastActiveAlarmsUpdateAsync(
        int alarmCount,
        CancellationToken cancellationToken = default)
    {
        var request = new BroadcastActiveAlarmsRequestDto
        {
            AlarmCount = alarmCount,
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
        };

        return await BroadcastActiveAlarmsUpdateAsync(request, cancellationToken);
    }
}
