namespace API.Models.Dto;

/// <summary>
/// Response DTO for editing an alarm operation
/// </summary>
public class EditAlarmResponseDto
{
    /// <summary>
    /// Indicates whether the alarm was successfully updated
    /// </summary>
    public bool IsSuccessful { get; set; }
}