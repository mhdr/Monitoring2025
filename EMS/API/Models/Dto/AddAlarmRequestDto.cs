
using Share.Libs;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for adding a new alarm to a monitoring item
/// </summary>
public class AddAlarmRequestDto
{
    /// <summary>
    /// ID of the monitoring item to add the alarm to
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

    /// <summary>
    /// Type of alarm (Digital, Analog, etc.)
    /// </summary>
    public AlarmType AlarmType { get; set; }

    /// <summary>
    /// Priority level of the alarm (Critical, High, Medium, Low)
    /// </summary>
    public AlarmPriority AlarmPriority { get; set; }

    /// <summary>
    /// Comparison operation type (Equal, Greater, Less, Between, etc.)
    /// </summary>
    public CompareType CompareType { get; set; }
}