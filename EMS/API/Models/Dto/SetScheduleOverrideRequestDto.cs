using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for setting manual override on a schedule memory
/// </summary>
public class SetScheduleOverrideRequestDto
{
    /// <summary>
    /// ID of the schedule memory
    /// </summary>
    [Required(ErrorMessage = "ID is required")]
    public Guid Id { get; set; }

    /// <summary>
    /// Whether to activate (true) or deactivate (false) the override
    /// </summary>
    public bool Activate { get; set; }

    /// <summary>
    /// Analog override value (for AnalogOutput items)
    /// </summary>
    public double? AnalogValue { get; set; }

    /// <summary>
    /// Digital override value (for DigitalOutput items)
    /// </summary>
    public bool? DigitalValue { get; set; }
}
