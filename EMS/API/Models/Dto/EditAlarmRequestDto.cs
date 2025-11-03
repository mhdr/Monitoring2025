using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for editing an existing alarm configuration
/// </summary>
public class EditAlarmRequestDto
{
    /// <summary>
    /// Unique identifier of the alarm to edit
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    [Required(ErrorMessage = "Alarm ID is required")]
    public Guid Id { get; set; }

    /// <summary>
    /// ID of the monitoring item this alarm belongs to
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440001</example>
    [Required(ErrorMessage = "Item ID is required")]
    public Guid ItemId { get; set; }

    /// <summary>
    /// Whether the alarm is disabled (won't trigger notifications)
    /// </summary>
    /// <example>false</example>
    public bool IsDisabled { get; set; }

    /// <summary>
    /// Delay in seconds before the alarm triggers after condition is met
    /// </summary>
    /// <example>5</example>
    [Range(0, 86400, ErrorMessage = "Alarm delay must be between 0 and 86400 seconds (24 hours)")]
    public int AlarmDelay { get; set; }

    /// <summary>
    /// Custom message to display when the alarm triggers (English)
    /// </summary>
    /// <example>Temperature exceeded maximum threshold</example>
    [StringLength(500, ErrorMessage = "Message cannot exceed 500 characters")]
    public string? Message { get; set; }

    /// <summary>
    /// Custom message to display when the alarm triggers (Farsi)
    /// </summary>
    /// <example>حداکثر آستانه دما تجاوز شده است</example>
    [StringLength(500, ErrorMessage = "Message cannot exceed 500 characters")]
    public string? MessageFa { get; set; }

    /// <summary>
    /// First comparison value for the alarm condition
    /// </summary>
    /// <example>75.5</example>
    [StringLength(100, ErrorMessage = "Value1 cannot exceed 100 characters")]
    public string? Value1 { get; set; }

    /// <summary>
    /// Second comparison value for range-based alarm conditions
    /// </summary>
    /// <example>100.0</example>
    [StringLength(100, ErrorMessage = "Value2 cannot exceed 100 characters")]
    public string? Value2 { get; set; }

    /// <summary>
    /// Optional timeout in seconds for alarm acknowledgment
    /// </summary>
    /// <example>300</example>
    [Range(0, 86400, ErrorMessage = "Timeout must be between 0 and 86400 seconds (24 hours)")]
    public int? Timeout { get; set; }
}