namespace API.Models.Dto;

/// <summary>
/// Response DTO for resetting a rate of change memory
/// </summary>
public class ResetRateOfChangeMemoryResponseDto
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
