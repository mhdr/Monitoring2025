namespace API.Models.Dto;

/// <summary>
/// Response DTO for deleting a timeout memory configuration
/// </summary>
public class DeleteTimeoutMemoryResponseDto
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
