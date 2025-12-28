using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for deleting a timeout memory configuration
/// </summary>
public class DeleteTimeoutMemoryRequestDto
{
    /// <summary>
    /// Unique identifier of the timeout memory to delete
    /// </summary>
    [Required(ErrorMessage = "Timeout memory ID is required")]
    public Guid Id { get; set; }
}
