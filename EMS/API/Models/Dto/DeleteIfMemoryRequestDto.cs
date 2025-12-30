using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for deleting an IF memory
/// </summary>
public class DeleteIfMemoryRequestDto
{
    /// <summary>
    /// ID of the IF memory to delete
    /// </summary>
    [Required(ErrorMessage = "IF memory ID is required")]
    public Guid Id { get; set; }
}
