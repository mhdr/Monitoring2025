namespace Contracts;

/// <summary>
/// Message broadcast from ModbusGateway worker to update gateway status in real-time.
/// </summary>
public class GatewayStatusMessage
{
    public GatewayStatusMessage()
    {
    }

    public GatewayStatusMessage(Guid gatewayId, string name, int connectedClients, DateTime? lastReadTime, DateTime? lastWriteTime)
    {
        GatewayId = gatewayId;
        Name = name;
        ConnectedClients = connectedClients;
        LastReadTime = lastReadTime;
        LastWriteTime = lastWriteTime;
    }

    /// <summary>
    /// The unique identifier of the gateway.
    /// </summary>
    public Guid GatewayId { get; set; }

    /// <summary>
    /// The display name of the gateway.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Current number of connected clients.
    /// </summary>
    public int ConnectedClients { get; set; }

    /// <summary>
    /// Timestamp of the last read request.
    /// </summary>
    public DateTime? LastReadTime { get; set; }

    /// <summary>
    /// Timestamp of the last write request.
    /// </summary>
    public DateTime? LastWriteTime { get; set; }
}
