namespace API.Models.Dto;

/// <summary>
/// Request DTO for deleting a Modbus gateway
/// </summary>
public class DeleteModbusGatewayRequestDto
{
    /// <summary>
    /// Unique identifier of the gateway to delete
    /// </summary>
    public Guid Id { get; set; }
}
