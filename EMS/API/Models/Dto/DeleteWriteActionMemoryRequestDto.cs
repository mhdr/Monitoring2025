using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for deleting a write action memory configuration
/// </summary>
public class DeleteWriteActionMemoryRequestDto
{
    /// <summary>
    /// Unique identifier of the write action memory to delete
    /// </summary>
    [Required(ErrorMessage = "Write action memory ID is required")]
    public Guid Id { get; set; }
}
