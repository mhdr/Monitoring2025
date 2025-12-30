namespace API.Models.Dto;

/// <summary>
/// Response DTO for deleting an IF memory
/// </summary>
public class DeleteIfMemoryResponseDto
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
