using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for deleting a min/max selector memory
/// </summary>
public class DeleteMinMaxSelectorMemoryRequestDto
{
    /// <summary>
    /// ID of the min/max selector memory to delete
    /// </summary>
    [Required(ErrorMessage = "ID is required")]
    public Guid Id { get; set; }
}
