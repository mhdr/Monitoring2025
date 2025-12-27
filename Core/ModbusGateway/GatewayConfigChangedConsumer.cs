using Contracts;
using MassTransit;
using Microsoft.Extensions.Logging;

namespace ModbusGateway;

/// <summary>
/// MassTransit consumer that handles gateway configuration change messages.
/// Triggers gateway start/stop/restart based on the change type.
/// </summary>
public class GatewayConfigChangedConsumer : IConsumer<GatewayConfigChangedMessage>
{
    private readonly ILogger<GatewayConfigChangedConsumer> _logger;
    private readonly GatewayManager _gatewayManager;

    public GatewayConfigChangedConsumer(
        ILogger<GatewayConfigChangedConsumer> logger,
        GatewayManager gatewayManager)
    {
        _logger = logger;
        _gatewayManager = gatewayManager;
    }

    public async Task Consume(ConsumeContext<GatewayConfigChangedMessage> context)
    {
        var message = context.Message;

        _logger.LogInformation(
            "Received GatewayConfigChangedMessage: GatewayId={GatewayId}, ChangeType={ChangeType}",
            message.GatewayId, message.ChangeType);

        try
        {
            await _gatewayManager.HandleConfigChangedAsync(message);

            _logger.LogInformation(
                "Successfully handled config change for gateway {GatewayId}",
                message.GatewayId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to handle config change for gateway {GatewayId}",
                message.GatewayId);
            throw;
        }
    }
}
