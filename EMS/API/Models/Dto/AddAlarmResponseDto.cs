namespace API.Models.Dto;

/// <summary>
/// Response DTO for adding an alarm operation
/// </summary>
public class AddAlarmResponseDto
{
    /// <summary>
    /// Indicates whether the alarm was successfully added
    /// </summary>
    public bool IsSuccessful { get; set; }
}