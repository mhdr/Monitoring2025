namespace API.Models.Dto;

/// <summary>
/// Response DTO for adding a new average memory configuration
/// </summary>
public class AddAverageMemoryResponseDto
{
    /// <summary>
    /// Indicates if the operation was successful
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// Error message if operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// ID of the newly created average memory (if successful)
    /// </summary>
    public Guid? Id { get; set; }
}
