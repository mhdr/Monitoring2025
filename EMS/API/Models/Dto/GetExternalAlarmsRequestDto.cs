using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request model for retrieving external alarm configurations
/// </summary>
public class GetExternalAlarmsRequestDto
{
    /// <summary>
    /// The unique identifier of the parent alarm
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    [Required(ErrorMessage = "AlarmId is required")]
    public Guid AlarmId { get; set; }
}