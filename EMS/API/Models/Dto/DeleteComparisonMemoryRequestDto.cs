using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for deleting a comparison memory
/// </summary>
public class DeleteComparisonMemoryRequestDto
{
    /// <summary>
    /// ID of the comparison memory to delete
    /// </summary>
    [Required(ErrorMessage = "ID is required")]
    public Guid Id { get; set; }
}
