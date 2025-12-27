namespace Contracts;

/// <summary>
/// Message published when gateway configuration changes, triggering worker reload.
/// </summary>
public class GatewayConfigChangedMessage
{
    public GatewayConfigChangedMessage()
    {
    }

    public GatewayConfigChangedMessage(Guid gatewayId, GatewayConfigChangeType changeType)
    {
        GatewayId = gatewayId;
        ChangeType = changeType;
    }

    /// <summary>
    /// The unique identifier of the gateway that changed.
    /// </summary>
    public Guid GatewayId { get; set; }

    /// <summary>
    /// The type of change that occurred.
    /// </summary>
    public GatewayConfigChangeType ChangeType { get; set; }
}

/// <summary>
/// Specifies the type of configuration change for gateway notifications.
/// </summary>
public enum GatewayConfigChangeType
{
    Added = 1,
    Updated = 2,
    Deleted = 3,
}
