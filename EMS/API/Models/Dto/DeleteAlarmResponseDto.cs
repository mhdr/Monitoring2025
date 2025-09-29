namespace API.Models.Dto;

/// <summary>
/// Response DTO for deleting an alarm operation
/// </summary>
public class DeleteAlarmResponseDto
{
    /// <summary>
    /// Indicates whether the alarm was successfully deleted
    /// </summary>
    public bool IsSuccess { get; set; }
}