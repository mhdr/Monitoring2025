using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for editing a schedule memory configuration
/// </summary>
public class EditScheduleMemoryRequestDto
{
    /// <summary>
    /// ID of the schedule memory to edit
    /// </summary>
    [Required(ErrorMessage = "ID is required")]
    public Guid Id { get; set; }

    /// <summary>
    /// Human-readable name for the schedule
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// ID of the output monitoring item (must be AnalogOutput or DigitalOutput)
    /// </summary>
    [Required(ErrorMessage = "Output item ID is required")]
    public Guid OutputItemId { get; set; }

    /// <summary>
    /// Execution interval in seconds
    /// </summary>
    [Required(ErrorMessage = "Interval is required")]
    [Range(1, int.MaxValue, ErrorMessage = "Interval must be greater than 0")]
    public int Interval { get; set; } = 10;

    /// <summary>
    /// Whether the memory is disabled
    /// </summary>
    public bool IsDisabled { get; set; } = false;

    /// <summary>
    /// Optional holiday calendar ID for exception handling
    /// </summary>
    public Guid? HolidayCalendarId { get; set; }

    /// <summary>
    /// Default analog output value when no schedule block is active
    /// </summary>
    public double? DefaultAnalogValue { get; set; }

    /// <summary>
    /// Default digital output value when no schedule block is active
    /// </summary>
    public bool? DefaultDigitalValue { get; set; }

    /// <summary>
    /// Override expiration mode (1=TimeBased, 2=EventBased)
    /// </summary>
    [Range(1, 2, ErrorMessage = "Override expiration mode must be 1 (TimeBased) or 2 (EventBased)")]
    public int OverrideExpirationMode { get; set; } = 1;

    /// <summary>
    /// Duration in minutes for time-based override expiration
    /// </summary>
    [Range(1, int.MaxValue, ErrorMessage = "Override duration must be greater than 0")]
    public int OverrideDurationMinutes { get; set; } = 60;

    /// <summary>
    /// Schedule blocks for this memory (replaces existing blocks)
    /// </summary>
    public List<AddScheduleBlockDto>? ScheduleBlocks { get; set; }
}
