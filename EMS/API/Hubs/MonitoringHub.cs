using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace API.Hubs;

/// <summary>
/// SignalR hub for real-time monitoring updates.
/// Provides real-time notifications to connected clients about active alarms.
/// </summary>
[Authorize]
public class MonitoringHub : Hub
{
    private readonly ILogger<MonitoringHub> _logger;

    /// <summary>
    /// Initializes a new instance of the MonitoringHub
    /// </summary>
    /// <param name="logger">Logger instance for structured logging</param>
    public MonitoringHub(ILogger<MonitoringHub> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Called when a client connects to the hub
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.Identity?.Name ?? "Unknown";
        var connectionId = Context.ConnectionId;
        
        _logger.LogInformation("Client connected to MonitoringHub. ConnectionId: {ConnectionId}, User: {UserId}", 
            connectionId, userId);

        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Called when a client disconnects from the hub
    /// </summary>
    /// <param name="exception">Exception that caused the disconnect, if any</param>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.Identity?.Name ?? "Unknown";
        var connectionId = Context.ConnectionId;

        if (exception != null)
        {
            _logger.LogWarning(exception, 
                "Client disconnected from MonitoringHub with error. ConnectionId: {ConnectionId}, User: {UserId}", 
                connectionId, userId);
        }
        else
        {
            _logger.LogInformation("Client disconnected from MonitoringHub. ConnectionId: {ConnectionId}, User: {UserId}", 
                connectionId, userId);
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Client method to subscribe to active alarms updates.
    /// This is optional - the server will broadcast to all connected clients.
    /// </summary>
    public async Task SubscribeToActiveAlarms()
    {
        var userId = Context.User?.Identity?.Name ?? "Unknown";
        var connectionId = Context.ConnectionId;
        
        _logger.LogInformation("Client subscribed to active alarms. ConnectionId: {ConnectionId}, User: {UserId}", 
            connectionId, userId);

        await Task.CompletedTask;
    }
}
