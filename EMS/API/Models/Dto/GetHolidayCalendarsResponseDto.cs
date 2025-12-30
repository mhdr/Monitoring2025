namespace API.Models.Dto;

/// <summary>
/// Response DTO for getting holiday calendars
/// </summary>
public class GetHolidayCalendarsResponseDto
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
    /// List of holiday calendar items
    /// </summary>
    public List<HolidayCalendarItemDto>? HolidayCalendars { get; set; }
}

/// <summary>
/// Individual holiday calendar item DTO
/// </summary>
public class HolidayCalendarItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    
    /// <summary>
    /// Holiday dates in this calendar
    /// </summary>
    public List<HolidayDateItemDto>? Dates { get; set; }
}

/// <summary>
/// Holiday date item DTO
/// </summary>
public class HolidayDateItemDto
{
    public Guid Id { get; set; }
    public Guid HolidayCalendarId { get; set; }
    public string Date { get; set; } = string.Empty;  // Format: "yyyy-MM-dd"
    public string? Name { get; set; }
    public double? HolidayAnalogValue { get; set; }
    public bool? HolidayDigitalValue { get; set; }
}
