using API.Services;
using Contracts;
using MassTransit;

namespace API.Consumers;

/// <summary>
/// MassTransit consumer that handles gateway status messages from the ModbusGateway worker.
/// Updates the database with the latest gateway status and broadcasts to SignalR clients.
/// </summary>
public class GatewayStatusConsumer : IConsumer<GatewayStatusMessage>
{
    private readonly ILogger<GatewayStatusConsumer> _logger;
    private readonly SignalRBroadcastService _broadcastService;

    public GatewayStatusConsumer(
        ILogger<GatewayStatusConsumer> logger,
        SignalRBroadcastService broadcastService)
    {
        _logger = logger;
        _broadcastService = broadcastService;
    }

    public async Task Consume(ConsumeContext<GatewayStatusMessage> context)
    {
        var message = context.Message;

        _logger.LogDebug(
            "Received GatewayStatusMessage: GatewayId={GatewayId}, Name={Name}, ConnectedClients={ConnectedClients}",
            message.GatewayId, message.Name, message.ConnectedClients);

        try
        {
            // Update database with latest status
            await Core.Controllers.UpdateGatewayStatus(
                message.GatewayId,
                message.ConnectedClients,
                message.LastReadTime,
                message.LastWriteTime);

            // Broadcast to SignalR clients for real-time UI updates
            await _broadcastService.BroadcastGatewayStatusAsync(
                message.GatewayId,
                message.Name,
                message.ConnectedClients,
                message.LastReadTime,
                message.LastWriteTime);

            _logger.LogDebug(
                "Successfully processed gateway status for {GatewayId}",
                message.GatewayId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to process gateway status for {GatewayId}",
                message.GatewayId);
            // Don't rethrow - status updates are not critical enough to retry
        }
    }
}
