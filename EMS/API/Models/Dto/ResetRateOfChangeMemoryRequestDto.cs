using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for resetting a rate of change memory state
/// </summary>
public class ResetRateOfChangeMemoryRequestDto
{
    /// <summary>
    /// ID of the rate of change memory to reset
    /// </summary>
    [Required(ErrorMessage = "ID is required")]
    public Guid Id { get; set; }
}
