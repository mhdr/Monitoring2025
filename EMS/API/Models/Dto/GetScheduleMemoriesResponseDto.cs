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
    public Guid OutputItemId { get; set; }
    public int Interval { get; set; }
    public bool IsDisabled { get; set; }
    public Guid? HolidayCalendarId { get; set; }
    public string? HolidayCalendarName { get; set; }
    public double? DefaultAnalogValue { get; set; }
    public bool? DefaultDigitalValue { get; set; }
    public bool ManualOverrideActive { get; set; }
    public double? ManualOverrideAnalogValue { get; set; }
    public bool? ManualOverrideDigitalValue { get; set; }
    public int OverrideExpirationMode { get; set; }
    public int OverrideDurationMinutes { get; set; }
    public DateTime? OverrideActivationTime { get; set; }
    public Guid? LastActiveBlockId { get; set; }
    
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
    public string EndTime { get; set; } = string.Empty;    // Format: "HH:mm:ss"
    public int Priority { get; set; }
    public double? AnalogOutputValue { get; set; }
    public bool? DigitalOutputValue { get; set; }
    public string? Description { get; set; }
}
