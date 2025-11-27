namespace API.Models.Dto;

/// <summary>
/// Response DTO for deleting a Modbus controller
/// </summary>
public class DeleteModbusControllerResponseDto
{
    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// Error type if the deletion failed
    /// </summary>
    public DeleteModbusControllerErrorType? Error { get; set; }

    /// <summary>
    /// Error message if the operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Error types for Modbus controller deletion
    /// </summary>
    public enum DeleteModbusControllerErrorType
    {
        /// <summary>
        /// Controller has associated mappings and cannot be deleted
        /// </summary>
        HasMappings = 1,

        /// <summary>
        /// Controller not found
        /// </summary>
        NotFound = 2,
    }
}
