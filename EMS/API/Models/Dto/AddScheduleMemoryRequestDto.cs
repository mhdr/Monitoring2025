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
    /// Type of the output source: 0=Point, 1=GlobalVariable
    /// </summary>
    [Required(ErrorMessage = "Output type is required")]
    public int OutputType { get; set; }

    /// <summary>
    /// Reference to the output source (GUID string for Point, name for GlobalVariable)
    /// </summary>
    [Required(ErrorMessage = "Output reference is required")]
    public string OutputReference { get; set; } = string.Empty;

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
    /// Write duration in seconds for controller writes. Default: 10. Must be >= 0.
    /// </summary>
    [Range(0, long.MaxValue, ErrorMessage = "Duration must be greater than or equal to 0")]
    public long Duration { get; set; } = 10;

    /// <summary>
    /// Optional holiday calendar ID for exception handling
    /// </summary>
    public Guid? HolidayCalendarId { get; set; }

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
    /// End time in format "HH:mm:ss" (optional for blocks without explicit end time)
    /// Can be earlier than StartTime for cross-midnight blocks (e.g., "22:00:00" to "02:00:00")
    /// </summary>
    public string? EndTime { get; set; }

    /// <summary>
    /// Priority level (1=Low, 2=Normal, 3=High, 4=Critical)
    /// </summary>
    [Range(1, 4, ErrorMessage = "Priority must be 1-4")]
    public int Priority { get; set; } = 2;

    /// <summary>
    /// Behavior when EndTime is null (1=UseDefault, 2=ExtendToEndOfDay)
    /// Default is 2 (ExtendToEndOfDay)
    /// </summary>
    [Range(1, 2, ErrorMessage = "Null end time behavior must be 1 (UseDefault) or 2 (ExtendToEndOfDay)")]
    public int NullEndTimeBehavior { get; set; } = 2;

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
