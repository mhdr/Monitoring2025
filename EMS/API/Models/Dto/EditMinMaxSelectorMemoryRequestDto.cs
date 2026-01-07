using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for editing an existing Min/Max Selector Memory configuration
/// </summary>
public class EditMinMaxSelectorMemoryRequestDto
{
    /// <summary>
    /// ID of the min/max selector memory to edit
    /// </summary>
    [Required(ErrorMessage = "ID is required")]
    public Guid Id { get; set; }

    /// <summary>
    /// Human-readable name for the min/max selector memory
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// JSON array of input item IDs to compare.
    /// Must contain between 2 and 16 valid AnalogInput or AnalogOutput item GUIDs.
    /// Format: ["guid1", "guid2", ..., "guidN"]
    /// </summary>
    [Required(ErrorMessage = "Input item IDs are required")]
    public string InputItemIds { get; set; } = "[]";

    /// <summary>
    /// Type of the output source: 0=Point, 1=GlobalVariable
    /// </summary>
    [Required(ErrorMessage = "Output type is required")]
    public int OutputType { get; set; } = 0;

    /// <summary>
    /// Reference to the output source (GUID string for Point, name for GlobalVariable)
    /// </summary>
    [Required(ErrorMessage = "Output reference is required")]
    public string OutputReference { get; set; } = string.Empty;

    /// <summary>
    /// (Legacy) ID of the output monitoring item where the selected min/max value will be written.
    /// Must be AnalogOutput type.
    /// DEPRECATED: Use OutputType and OutputReference instead
    /// </summary>
    [Required(ErrorMessage = "Output item ID is required")]
    public Guid OutputItemId { get; set; }

    /// <summary>
    /// Type of the selected index output source: 0=Point, 1=GlobalVariable
    /// </summary>
    public int? SelectedIndexOutputType { get; set; }

    /// <summary>
    /// Reference to the selected index output source (GUID string for Point, name for GlobalVariable)
    /// </summary>
    public string? SelectedIndexOutputReference { get; set; }

    /// <summary>
    /// (Legacy) Optional output item ID for the selected input index (1-16).
    /// When configured, writes which input (by position) was selected.
    /// Must be AnalogOutput type if specified.
    /// DEPRECATED: Use SelectedIndexOutputType and SelectedIndexOutputReference instead
    /// </summary>
    public Guid? SelectedIndexOutputItemId { get; set; }

    /// <summary>
    /// Selection mode: 1 = Minimum, 2 = Maximum
    /// Default: 1 (Minimum)
    /// </summary>
    [Required(ErrorMessage = "Selection mode is required")]
    [Range(1, 2, ErrorMessage = "Selection mode must be 1 (Minimum) or 2 (Maximum)")]
    public int SelectionMode { get; set; } = 1;

    /// <summary>
    /// Failover mode: 1 = IgnoreBad, 2 = FallbackToOpposite, 3 = HoldLastGood
    /// Default: 1 (IgnoreBad)
    /// </summary>
    [Required(ErrorMessage = "Failover mode is required")]
    [Range(1, 3, ErrorMessage = "Failover mode must be 1 (IgnoreBad), 2 (FallbackToOpposite), or 3 (HoldLastGood)")]
    public int FailoverMode { get; set; } = 1;

    /// <summary>
    /// Execution interval in seconds (must be greater than 0)
    /// </summary>
    [Required(ErrorMessage = "Interval is required")]
    [Range(1, int.MaxValue, ErrorMessage = "Interval must be greater than 0")]
    public int Interval { get; set; } = 10;

    /// <summary>
    /// Whether the min/max selector memory is disabled
    /// </summary>
    public bool IsDisabled { get; set; } = false;

    /// <summary>
    /// Write duration in seconds for controller writes. Default: 10. Must be >= 0.
    /// </summary>
    [Range(0, long.MaxValue, ErrorMessage = "Duration must be greater than or equal to 0")]
    public long Duration { get; set; } = 10;
}
