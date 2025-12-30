namespace API.Models.Dto;

/// <summary>
/// Response DTO for adding a statistical memory
/// </summary>
public class AddStatisticalMemoryResponseDto
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
    /// ID of the created statistical memory
    /// </summary>
    public Guid? Id { get; set; }
}
