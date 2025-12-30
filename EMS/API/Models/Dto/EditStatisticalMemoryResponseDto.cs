namespace API.Models.Dto;

/// <summary>
/// Response DTO for editing a statistical memory
/// </summary>
public class EditStatisticalMemoryResponseDto
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
