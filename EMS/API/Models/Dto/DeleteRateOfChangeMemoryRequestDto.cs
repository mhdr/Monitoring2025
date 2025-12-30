using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for deleting a rate of change memory
/// </summary>
public class DeleteRateOfChangeMemoryRequestDto
{
    /// <summary>
    /// ID of the rate of change memory to delete
    /// </summary>
    [Required(ErrorMessage = "ID is required")]
    public Guid Id { get; set; }
}
