using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for deleting a schedule memory
/// </summary>
public class DeleteScheduleMemoryRequestDto
{
    /// <summary>
    /// ID of the schedule memory to delete
    /// </summary>
    [Required(ErrorMessage = "ID is required")]
    public Guid Id { get; set; }
}
