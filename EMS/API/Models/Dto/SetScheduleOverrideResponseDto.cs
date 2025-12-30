namespace API.Models.Dto;

/// <summary>
/// Response DTO for setting manual override
/// </summary>
public class SetScheduleOverrideResponseDto
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
