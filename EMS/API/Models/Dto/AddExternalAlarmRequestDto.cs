using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for adding a new external alarm to a parent alarm
/// </summary>
public class AddExternalAlarmRequestDto
{
    /// <summary>
    /// The parent alarm ID that this external alarm belongs to
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    [Required(ErrorMessage = "AlarmId is required")]
    public Guid AlarmId { get; set; }

    /// <summary>
    /// The monitoring item ID to control when the parent alarm triggers
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440002</example>
    [Required(ErrorMessage = "ItemId is required")]
    public Guid ItemId { get; set; }

    /// <summary>
    /// The output value to write when this external alarm is triggered
    /// </summary>
    /// <example>true</example>
    [Required(ErrorMessage = "Value is required")]
    public bool Value { get; set; }

    /// <summary>
    /// Indicates whether this external alarm should be initially disabled
    /// </summary>
    /// <example>false</example>
    public bool IsDisabled { get; set; } = false;
}
