namespace API.Models.Dto;

/// <summary>
/// Request DTO for editing an existing Modbus gateway configuration
/// </summary>
public class EditModbusGatewayRequestDto
{
    /// <summary>
    /// Unique identifier of the gateway to edit
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Display name of the gateway
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// IP address to listen on
    /// </summary>
    public string ListenIP { get; set; } = "0.0.0.0";

    /// <summary>
    /// TCP port to listen on (must be unique)
    /// </summary>
    public int Port { get; set; }

    /// <summary>
    /// Modbus unit/slave identifier (1-247)
    /// </summary>
    public byte UnitId { get; set; } = 1;

    /// <summary>
    /// Whether the gateway is enabled
    /// </summary>
    public bool IsEnabled { get; set; } = true;
}
