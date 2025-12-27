namespace API.Models.Dto;

/// <summary>
/// Response DTO for deleting a Modbus gateway
/// </summary>
public class DeleteModbusGatewayResponseDto
{
    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// Error message if the operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}
