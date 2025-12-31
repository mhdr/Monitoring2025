namespace API.Models.Dto;

/// <summary>
/// Response DTO for adding a min/max selector memory
/// </summary>
public class AddMinMaxSelectorMemoryResponseDto
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
    /// ID of the created min/max selector memory
    /// </summary>
    public Guid? Id { get; set; }
}
