namespace API.Models.Dto;

/// <summary>
/// Request DTO for getting Modbus gateway mappings
/// </summary>
public class GetModbusGatewayMappingsRequestDto
{
    /// <summary>
    /// The gateway ID to get mappings for
    /// </summary>
    public Guid GatewayId { get; set; }
}
