namespace API.Models.Dto;

/// <summary>
/// Response DTO for deleting an average memory configuration
/// </summary>
public class DeleteAverageMemoryResponseDto
{
    /// <summary>
    /// Indicates if the operation was successful
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// Error message if operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}
