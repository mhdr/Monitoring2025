using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for editing an existing write action memory configuration
/// </summary>
public class EditWriteActionMemoryRequestDto
{
    /// <summary>
    /// Unique identifier of the write action memory to edit
    /// </summary>
    [Required(ErrorMessage = "Write action memory ID is required")]
    public Guid Id { get; set; }

    /// <summary>
    /// Optional name for the write action memory
    /// </summary>
    public string? Name { get; set; }

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
    /// Duration parameter for WriteOrAddValue (must be >= 0)
    /// </summary>
    [Required(ErrorMessage = "Duration is required")]
    [Range(0, long.MaxValue, ErrorMessage = "Duration must be >= 0")]
    public long Duration { get; set; }

    /// <summary>
    /// Indicates whether this write action memory is disabled
    /// </summary>
    public bool IsDisabled { get; set; }
}
