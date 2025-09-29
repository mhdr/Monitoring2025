
namespace API.Models.Dto;

/// <summary>
/// Request DTO for editing an existing alarm configuration
/// </summary>
public class EditAlarmRequestDto
{
    /// <summary>
    /// Unique identifier of the alarm to edit
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// ID of the monitoring item this alarm belongs to
    /// </summary>
    public Guid ItemId { get; set; }

    /// <summary>
    /// Whether the alarm is disabled (won't trigger notifications)
    /// </summary>
    public bool IsDisabled { get; set; }

    /// <summary>
    /// Delay in seconds before the alarm triggers after condition is met
    /// </summary>
    public int AlarmDelay { get; set; }

    /// <summary>
    /// Custom message to display when the alarm triggers
    /// </summary>
    public string? Message { get; set; }

    /// <summary>
    /// First comparison value for the alarm condition
    /// </summary>
    public string? Value1 { get; set; }

    /// <summary>
    /// Second comparison value for range-based alarm conditions
    /// </summary>
    public string? Value2 { get; set; }

    /// <summary>
    /// Optional timeout in seconds for alarm acknowledgment
    /// </summary>
    public int? Timeout { get; set; }
}