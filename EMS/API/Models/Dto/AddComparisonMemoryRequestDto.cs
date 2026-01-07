using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for creating a new comparison memory configuration
/// </summary>
public class AddComparisonMemoryRequestDto
{
    /// <summary>
    /// Human-readable name for the comparison memory
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// JSON array of comparison groups. Each group contains:
    /// - id: Unique identifier for this group
    /// - inputItemIds: Array of input item GUIDs
    /// - requiredVotes: N in N-out-of-M voting
    /// - comparisonMode: 1=Analog, 2=Digital
    /// - compareType: 1=Equal, 2=NotEqual, 3=Higher, 4=Lower, 5=Between
    /// - threshold1: Primary threshold (for analog)
    /// - threshold2: Secondary threshold (for Between)
    /// - thresholdHysteresis: Hysteresis for analog thresholds
    /// - votingHysteresis: Hysteresis for vote counts
    /// - digitalValue: "0" or "1" (for digital)
    /// - name: Optional group name
    /// </summary>
    [Required(ErrorMessage = "Comparison groups are required")]
    public string ComparisonGroups { get; set; } = "[]";

    /// <summary>
    /// Operator used to combine group results (1=AND, 2=OR, 3=XOR)
    /// </summary>
    [Range(1, 3, ErrorMessage = "Group operator must be 1 (AND), 2 (OR), or 3 (XOR)")]
    public int GroupOperator { get; set; } = 1;

    /// <summary>
    /// Type of the output source: 0=Point, 1=GlobalVariable
    /// </summary>
    public int OutputType { get; set; } = 0;

    /// <summary>
    /// Reference to the output source (GUID string for Point, name for GlobalVariable)
    /// </summary>
    [Required(ErrorMessage = "Output reference is required")]
    public string OutputReference { get; set; } = string.Empty;

    /// <summary>
    /// [DEPRECATED] ID of the output monitoring item (must be DigitalOutput).
    /// Use OutputType and OutputReference instead. Kept for backward compatibility.
    /// </summary>
    public Guid OutputItemId { get; set; }

    /// <summary>
    /// Processing interval in seconds
    /// </summary>
    [Required(ErrorMessage = "Interval is required")]
    [Range(1, int.MaxValue, ErrorMessage = "Interval must be greater than 0")]
    public int Interval { get; set; } = 1;

    /// <summary>
    /// Whether the memory is disabled
    /// </summary>
    public bool IsDisabled { get; set; } = false;

    /// <summary>
    /// Whether to invert the final output (NOT operation)
    /// </summary>
    public bool InvertOutput { get; set; } = false;

    /// <summary>
    /// Write duration in seconds for controller writes. Default: 10. Must be >= 0.
    /// </summary>
    [Range(0, long.MaxValue, ErrorMessage = "Duration must be greater than or equal to 0")]
    public long Duration { get; set; } = 10;
}
