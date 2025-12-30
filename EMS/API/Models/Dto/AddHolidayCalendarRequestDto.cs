using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for creating a new holiday calendar
/// </summary>
public class AddHolidayCalendarRequestDto
{
    /// <summary>
    /// Name of the holiday calendar
    /// </summary>
    [Required(ErrorMessage = "Name is required")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Optional description
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Holiday dates for this calendar
    /// </summary>
    public List<AddHolidayDateDto>? Dates { get; set; }
}

/// <summary>
/// DTO for adding a holiday date
/// </summary>
public class AddHolidayDateDto
{
    /// <summary>
    /// Date in format "yyyy-MM-dd"
    /// </summary>
    [Required(ErrorMessage = "Date is required")]
    public string Date { get; set; } = string.Empty;

    /// <summary>
    /// Name of the holiday
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Optional analog value to use on this holiday
    /// </summary>
    public double? HolidayAnalogValue { get; set; }

    /// <summary>
    /// Optional digital value to use on this holiday
    /// </summary>
    public bool? HolidayDigitalValue { get; set; }
}
