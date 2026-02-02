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
    /// Schedule blocks for this memory (replaces existing blocks)
    /// </summary>
    public List<AddScheduleBlockDto>? ScheduleBlocks { get; set; }
}
