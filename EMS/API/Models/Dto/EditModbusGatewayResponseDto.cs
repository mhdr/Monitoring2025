namespace API.Models.Dto;

/// <summary>
/// Response DTO for editing a Modbus gateway
/// </summary>
public class EditModbusGatewayResponseDto
{
    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// Error message if the operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Validation errors if any (e.g., port conflicts)
    /// </summary>
    public List<GatewayValidationError>? ValidationErrors { get; set; }
}
