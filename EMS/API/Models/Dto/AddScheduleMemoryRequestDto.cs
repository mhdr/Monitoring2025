using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for creating a new schedule memory configuration
/// </summary>
public class AddScheduleMemoryRequestDto
{
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
    /// Schedule blocks for this memory
    /// </summary>
    public List<AddScheduleBlockDto>? ScheduleBlocks { get; set; }
}

/// <summary>
/// DTO for adding a schedule block
/// </summary>
public class AddScheduleBlockDto
{
    /// <summary>
    /// Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    /// </summary>
    [Required(ErrorMessage = "Day of week is required")]
    [Range(0, 6, ErrorMessage = "Day of week must be 0-6")]
    public int DayOfWeek { get; set; }

    /// <summary>
    /// Start time in format "HH:mm:ss"
    /// </summary>
    [Required(ErrorMessage = "Start time is required")]
    public string StartTime { get; set; } = string.Empty;

    /// <summary>
    /// End time in format "HH:mm:ss"
    /// </summary>
    [Required(ErrorMessage = "End time is required")]
    public string EndTime { get; set; } = string.Empty;

    /// <summary>
    /// Priority level (1=Low, 2=Normal, 3=High, 4=Critical)
    /// </summary>
    [Range(1, 4, ErrorMessage = "Priority must be 1-4")]
    public int Priority { get; set; } = 2;

    /// <summary>
    /// Analog output value for this block (for AnalogOutput items)
    /// </summary>
    public double? AnalogOutputValue { get; set; }

    /// <summary>
    /// Digital output value for this block (for DigitalOutput items)
    /// </summary>
    public bool? DigitalOutputValue { get; set; }

    /// <summary>
    /// Optional description for this block
    /// </summary>
    public string? Description { get; set; }
}
