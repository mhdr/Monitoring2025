using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for deleting a PID memory configuration
/// </summary>
public class DeletePIDMemoryRequestDto
{
    /// <summary>
    /// ID of the PID memory to delete
    /// </summary>
    [Required(ErrorMessage = "ID is required")]
    public Guid Id { get; set; }
}
