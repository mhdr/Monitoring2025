namespace API.Models.Dto;

/// <summary>
/// Response DTO for deleting a totalizer memory
/// </summary>
public class DeleteTotalizerMemoryResponseDto
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
