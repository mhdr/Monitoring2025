namespace API.Models.Dto;

/// <summary>
/// Response DTO for editing a timeout memory configuration
/// </summary>
public class EditTimeoutMemoryResponseDto
{
    /// <summary>
    /// Indicates whether the operation was successful
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// Error message if operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}
