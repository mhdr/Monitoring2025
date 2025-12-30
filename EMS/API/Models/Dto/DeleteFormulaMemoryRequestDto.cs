using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for deleting a formula memory
/// </summary>
public class DeleteFormulaMemoryRequestDto
{
    /// <summary>
    /// ID of the formula memory to delete
    /// </summary>
    [Required(ErrorMessage = "Formula memory ID is required")]
    public Guid Id { get; set; }
}
