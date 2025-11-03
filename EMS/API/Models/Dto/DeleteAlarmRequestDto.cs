using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for deleting an alarm configuration
/// </summary>
public class DeleteAlarmRequestDto
{
    /// <summary>
    /// Unique identifier of the alarm to delete
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    [Required(ErrorMessage = "Alarm ID is required")]
    public Guid Id { get; set; }
}