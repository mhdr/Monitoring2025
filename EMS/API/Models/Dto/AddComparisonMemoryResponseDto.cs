namespace API.Models.Dto;

/// <summary>
/// Response DTO for adding a comparison memory
/// </summary>
public class AddComparisonMemoryResponseDto
{
    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// Error message if operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// ID of the newly created comparison memory
    /// </summary>
    public Guid? Id { get; set; }
}
