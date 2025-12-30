using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for editing a holiday calendar
/// </summary>
public class EditHolidayCalendarRequestDto
{
    /// <summary>
    /// ID of the holiday calendar to edit
    /// </summary>
    [Required(ErrorMessage = "ID is required")]
    public Guid Id { get; set; }

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
    /// Holiday dates for this calendar (replaces existing dates)
    /// </summary>
    public List<AddHolidayDateDto>? Dates { get; set; }
}
