using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for updating an existing external alarm configuration
/// </summary>
public class UpdateExternalAlarmRequestDto
{
    /// <summary>
    /// The unique identifier of the external alarm to update
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440003</example>
    [Required(ErrorMessage = "Id is required")]
    public Guid Id { get; set; }

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
    /// Indicates whether this external alarm is currently disabled
    /// </summary>
    /// <example>false</example>
    public bool IsDisabled { get; set; }
}
