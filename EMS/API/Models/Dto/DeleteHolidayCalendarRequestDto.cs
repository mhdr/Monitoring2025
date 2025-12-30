using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for deleting a holiday calendar
/// </summary>
public class DeleteHolidayCalendarRequestDto
{
    /// <summary>
    /// ID of the holiday calendar to delete
    /// </summary>
    [Required(ErrorMessage = "ID is required")]
    public Guid Id { get; set; }
}
