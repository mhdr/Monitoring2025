using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for deleting an average memory configuration
/// </summary>
public class DeleteAverageMemoryRequestDto
{
    /// <summary>
    /// ID of the average memory to delete
    /// </summary>
    [Required(ErrorMessage = "ID is required")]
    public Guid Id { get; set; }
}
