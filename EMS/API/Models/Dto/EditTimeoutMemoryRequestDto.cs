using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for editing an existing timeout memory configuration
/// </summary>
public class EditTimeoutMemoryRequestDto
{
    /// <summary>
    /// Unique identifier of the timeout memory to edit
    /// </summary>
    [Required(ErrorMessage = "Timeout memory ID is required")]
    public Guid Id { get; set; }

    /// <summary>
    /// Type of the input source: 0=Point, 1=GlobalVariable
    /// </summary>
    [Required(ErrorMessage = "Input type is required")]
    public int InputType { get; set; }

    /// <summary>
    /// Reference to the input source (GUID string for Point, name for GlobalVariable)
    /// </summary>
    [Required(ErrorMessage = "Input reference is required")]
    public string InputReference { get; set; } = string.Empty;

    /// <summary>
    /// Type of the output source: 0=Point, 1=GlobalVariable
    /// </summary>
    [Required(ErrorMessage = "Output type is required")]
    public int OutputType { get; set; }

    /// <summary>
    /// Reference to the output source (GUID string for Point, name for GlobalVariable)
    /// </summary>
    [Required(ErrorMessage = "Output reference is required")]
    public string OutputReference { get; set; } = string.Empty;

    /// <summary>
    /// Timeout duration in seconds (must be greater than 0)
    /// </summary>
    [Required(ErrorMessage = "Timeout is required")]
    [Range(1, long.MaxValue, ErrorMessage = "Timeout must be greater than 0")]
    public long Timeout { get; set; }
}
