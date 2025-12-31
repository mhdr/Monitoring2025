using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for creating a new write action memory configuration
/// </summary>
public class AddWriteActionMemoryRequestDto
{
    /// <summary>
    /// Optional name for the write action memory
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// ID of the monitoring item to watch (input)
    /// Can be any item type (DigitalInput, DigitalOutput, AnalogInput, AnalogOutput)
    /// </summary>
    [Required(ErrorMessage = "Input item ID is required")]
    public Guid InputItemId { get; set; }

    /// <summary>
    /// ID of the monitoring item to write values (output)
    /// Must be DigitalOutput or AnalogOutput
    /// </summary>
    [Required(ErrorMessage = "Output item ID is required")]
    public Guid OutputItemId { get; set; }

    /// <summary>
    /// Static value to write (used when OutputValueSourceItemId is null)
    /// Either OutputValue or OutputValueSourceItemId must be provided, but not both
    /// </summary>
    public string? OutputValue { get; set; }

    /// <summary>
    /// ID of the item to read dynamic value from (used when OutputValue is null)
    /// Either OutputValue or OutputValueSourceItemId must be provided, but not both
    /// </summary>
    public Guid? OutputValueSourceItemId { get; set; }

    /// <summary>
    /// Interval in seconds between write actions (must be greater than 0)
    /// </summary>
    [Required(ErrorMessage = "Interval is required")]
    [Range(1, int.MaxValue, ErrorMessage = "Interval must be greater than 0")]
    public int Interval { get; set; }

    /// <summary>
    /// Duration parameter for WriteOrAddValue (must be >= 0)
    /// </summary>
    [Required(ErrorMessage = "Duration is required")]
    [Range(0, long.MaxValue, ErrorMessage = "Duration must be >= 0")]
    public long Duration { get; set; }

    /// <summary>
    /// Maximum number of times to execute the write action (null = continuous/unlimited)
    /// If provided, must be greater than 0
    /// </summary>
    [Range(1, int.MaxValue, ErrorMessage = "MaxExecutionCount must be greater than 0")]
    public int? MaxExecutionCount { get; set; }

    /// <summary>
    /// Indicates whether this write action memory is disabled
    /// </summary>
    public bool IsDisabled { get; set; }
}
