using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for resetting a totalizer memory
/// </summary>
public class ResetTotalizerMemoryRequestDto
{
    /// <summary>
    /// ID of the totalizer memory to reset
    /// </summary>
    [Required(ErrorMessage = "ID is required")]
    public Guid Id { get; set; }

    /// <summary>
    /// If true, keeps accumulated value in database but zeros output
    /// </summary>
    public bool PreserveInDatabase { get; set; } = false;
}
