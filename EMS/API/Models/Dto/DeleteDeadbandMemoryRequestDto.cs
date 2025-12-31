using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for deleting a deadband memory
/// </summary>
public class DeleteDeadbandMemoryRequestDto
{
    /// <summary>
    /// ID of the deadband memory to delete
    /// </summary>
    [Required(ErrorMessage = "ID is required")]
    public Guid Id { get; set; }
}
