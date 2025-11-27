namespace API.Models.Dto;

/// <summary>
/// Response DTO for editing a Modbus controller
/// </summary>
public class EditModbusControllerResponseDto
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
