namespace API.Models.Dto;

/// <summary>
/// Response DTO after editing a PID memory configuration
/// </summary>
public class EditPIDMemoryResponseDto
{
    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// Error message if operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}
