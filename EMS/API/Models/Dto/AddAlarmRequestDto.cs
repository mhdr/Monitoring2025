
using System.ComponentModel.DataAnnotations;
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
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    [Required(ErrorMessage = "ItemId is required")]
    public Guid ItemId { get; set; }

    /// <summary>
    /// Whether the alarm is disabled (won't trigger notifications)
    /// </summary>
    /// <example>false</example>
    public bool IsDisabled { get; set; }

    /// <summary>
    /// Delay in seconds before the alarm triggers after condition is met (prevents false alarms from transient conditions)
    /// </summary>
    /// <example>5</example>
    [Range(0, 3600, ErrorMessage = "AlarmDelay must be between 0 and 3600 seconds")]
    public int AlarmDelay { get; set; }

    /// <summary>
    /// Custom message to display when the alarm triggers
    /// </summary>
    /// <example>High temperature detected - immediate action required</example>
    [StringLength(500, ErrorMessage = "Message cannot exceed 500 characters")]
    public string? Message { get; set; }

    /// <summary>
    /// Custom message to display when the alarm triggers (Farsi version)
    /// </summary>
    /// <example>High temperature detected - immediate action required</example>
    [StringLength(500, ErrorMessage = "Message cannot exceed 500 characters")]
    public string? MessageFa { get; set; }


    /// <summary>
    /// First comparison value for the alarm condition (threshold or lower bound)
    /// </summary>
    /// <example>80.0</example>
    [StringLength(100, ErrorMessage = "Value1 cannot exceed 100 characters")]
    public string? Value1 { get; set; }

    /// <summary>
    /// Second comparison value for range-based alarm conditions (upper bound for Between/OutOfRange comparisons)
    /// </summary>
    /// <example>100.0</example>
    [StringLength(100, ErrorMessage = "Value2 cannot exceed 100 characters")]
    public string? Value2 { get; set; }

    /// <summary>
    /// Timeout duration in seconds - required for AlarmType 2 (Timeout-based alarms). Specifies how long to wait without data updates before triggering. Not used for AlarmType 1 (Comparative)
    /// </summary>
    /// <example>300</example>
    [Range(0, 86400, ErrorMessage = "Timeout must be between 0 and 86400 seconds (24 hours)")]
    public int? Timeout { get; set; }

    /// <summary>
    /// Type of alarm: Comparative (1) for digital/analog values using comparison logic, Timeout (2) for time-based alarms that trigger when no data is received
    /// </summary>
    /// <example>1</example>
    [Required(ErrorMessage = "AlarmType is required")]
    public AlarmType AlarmType { get; set; }

    /// <summary>
    /// Priority level: Critical (0), High (1), Medium (2), Low (3)
    /// </summary>
    /// <example>0</example>
    [Required(ErrorMessage = "AlarmPriority is required")]
    public AlarmPriority AlarmPriority { get; set; }

    /// <summary>
    /// Comparison operation: Equal (0), NotEqual (1), Greater (2), GreaterOrEqual (3), Less (4), LessOrEqual (5), Between (6), OutOfRange (7)
    /// </summary>
    /// <example>2</example>
    [Required(ErrorMessage = "CompareType is required")]
    public CompareType CompareType { get; set; }
}