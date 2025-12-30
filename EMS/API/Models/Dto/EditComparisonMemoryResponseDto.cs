namespace API.Models.Dto;

/// <summary>
/// Response DTO for editing a comparison memory
/// </summary>
public class EditComparisonMemoryResponseDto
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
