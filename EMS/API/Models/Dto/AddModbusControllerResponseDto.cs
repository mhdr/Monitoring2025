namespace API.Models.Dto;

/// <summary>
/// Response DTO for adding a new Modbus controller
/// </summary>
public class AddModbusControllerResponseDto
{
    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// The ID of the newly created controller (if successful)
    /// </summary>
    public Guid? ControllerId { get; set; }

    /// <summary>
    /// Error message if the operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}
