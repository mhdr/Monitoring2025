namespace API.Models.Dto;

/// <summary>
/// Response DTO for batch editing Modbus gateway mappings
/// </summary>
public class BatchEditModbusGatewayMappingsResponseDto
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
    /// Validation errors if any (e.g., address overlaps)
    /// </summary>
    public List<GatewayValidationError>? ValidationErrors { get; set; }
}
