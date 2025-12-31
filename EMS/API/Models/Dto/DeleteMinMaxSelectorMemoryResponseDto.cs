namespace API.Models.Dto;

/// <summary>
/// Response DTO for deleting a min/max selector memory
/// </summary>
public class DeleteMinMaxSelectorMemoryResponseDto
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
