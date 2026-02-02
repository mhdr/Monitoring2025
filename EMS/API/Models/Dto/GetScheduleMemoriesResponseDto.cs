namespace API.Models.Dto;

/// <summary>
/// Response DTO for getting schedule memories
/// </summary>
public class GetScheduleMemoriesResponseDto
{
    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// Error message if operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// List of schedule memory items
    /// </summary>
    public List<ScheduleMemoryItemDto>? ScheduleMemories { get; set; }
}

/// <summary>
/// Individual schedule memory item DTO
/// </summary>
public class ScheduleMemoryItemDto
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    
    /// <summary>
    /// Type of the output source: 0=Point, 1=GlobalVariable
    /// </summary>
    public int OutputType { get; set; }
    
    /// <summary>
    /// Reference to the output source (GUID string for Point, name for GlobalVariable)
    /// </summary>
    public string OutputReference { get; set; } = string.Empty;
    public int Interval { get; set; }
    public bool IsDisabled { get; set; }

    /// <summary>
    /// Write duration in seconds for controller writes. Default: 10
    /// </summary>
    public long Duration { get; set; }

    public Guid? HolidayCalendarId { get; set; }
    public string? HolidayCalendarName { get; set; }
    
    /// <summary>
    /// Schedule blocks for this memory
    /// </summary>
    public List<ScheduleBlockItemDto>? ScheduleBlocks { get; set; }
}

/// <summary>
/// Schedule block item DTO
/// </summary>
public class ScheduleBlockItemDto
{
    public Guid Id { get; set; }
    public Guid ScheduleMemoryId { get; set; }
    public int DayOfWeek { get; set; }
    public string StartTime { get; set; } = string.Empty;  // Format: "HH:mm:ss"
    public string? EndTime { get; set; }    // Format: "HH:mm:ss" (optional for blocks without explicit end time)
    public int Priority { get; set; }
    public int NullEndTimeBehavior { get; set; }  // 1=UseDefault, 2=ExtendToEndOfDay
    public double? AnalogOutputValue { get; set; }
    public bool? DigitalOutputValue { get; set; }
    public string? Description { get; set; }
}
