using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for deleting a statistical memory
/// </summary>
public class DeleteStatisticalMemoryRequestDto
{
    /// <summary>
    /// ID of the statistical memory to delete
    /// </summary>
    [Required(ErrorMessage = "ID is required")]
    public Guid Id { get; set; }
}
