using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for deleting a totalizer memory
/// </summary>
public class DeleteTotalizerMemoryRequestDto
{
    /// <summary>
    /// ID of the totalizer memory to delete
    /// </summary>
    [Required(ErrorMessage = "ID is required")]
    public Guid Id { get; set; }
}
