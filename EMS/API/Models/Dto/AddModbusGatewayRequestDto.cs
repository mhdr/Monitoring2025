namespace API.Models.Dto;

/// <summary>
/// Request DTO for adding a new Modbus gateway configuration
/// </summary>
public class AddModbusGatewayRequestDto
{
    /// <summary>
    /// Display name of the gateway
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// IP address to listen on (default: "0.0.0.0" for all interfaces)
    /// </summary>
    public string ListenIP { get; set; } = "0.0.0.0";

    /// <summary>
    /// TCP port to listen on (required, must be unique)
    /// </summary>
    public int Port { get; set; }

    /// <summary>
    /// Modbus unit/slave identifier (1-247, default: 1)
    /// </summary>
    public byte UnitId { get; set; } = 1;

    /// <summary>
    /// Whether the gateway is enabled (default: true)
    /// </summary>
    public bool IsEnabled { get; set; } = true;
}
