using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for removing an external alarm from a parent alarm
/// </summary>
public class RemoveExternalAlarmRequestDto
{
    /// <summary>
    /// The unique identifier of the external alarm to remove
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440003</example>
    [Required(ErrorMessage = "Id is required")]
    public Guid Id { get; set; }
}
