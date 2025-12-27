namespace API.Models.Dto;

/// <summary>
/// Response DTO for adding a new Modbus gateway
/// </summary>
public class AddModbusGatewayResponseDto
{
    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// The ID of the newly created gateway (if successful)
    /// </summary>
    public Guid? GatewayId { get; set; }

    /// <summary>
    /// Error message if the operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Validation errors if any (e.g., port conflicts)
    /// </summary>
    public List<GatewayValidationError>? ValidationErrors { get; set; }
}
