namespace API.Models.Dto;

/// <summary>
/// Request DTO for deleting an alarm
/// </summary>
public class DeleteAlarmRequestDto
{
    /// <summary>
    /// Unique identifier of the alarm to delete
    /// </summary>
    public Guid Id { get; set; }
}