using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for retrieving external alarms linked to a parent alarm
/// </summary>
public class GetExternalAlarmsRequestDto
{
    /// <summary>
    /// The parent alarm ID to retrieve external alarms for
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    [Required(ErrorMessage = "AlarmId is required")]
    public Guid AlarmId { get; set; }
}
