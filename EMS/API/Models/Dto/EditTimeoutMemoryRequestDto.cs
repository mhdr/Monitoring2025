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
    /// ID of the monitoring item to watch for timeout (input)
    /// Can be DigitalInput, DigitalOutput, AnalogInput, or AnalogOutput
    /// </summary>
    [Required(ErrorMessage = "Input item ID is required")]
    public Guid InputItemId { get; set; }

    /// <summary>
    /// ID of the monitoring item to write timeout status (output)
    /// Should be DigitalInput or DigitalOutput
    /// </summary>
    [Required(ErrorMessage = "Output item ID is required")]
    public Guid OutputItemId { get; set; }

    /// <summary>
    /// Timeout duration in seconds (must be greater than 0)
    /// </summary>
    [Required(ErrorMessage = "Timeout is required")]
    [Range(1, long.MaxValue, ErrorMessage = "Timeout must be greater than 0")]
    public long Timeout { get; set; }
}
