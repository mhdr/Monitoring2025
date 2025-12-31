using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

/// <summary>
/// Represents a comparison/logic memory configuration that evaluates multiple inputs
/// using configurable N-out-of-M voting logic with AND/OR/XOR operators between groups.
/// Supports both analog threshold comparisons and digital logic modes.
/// </summary>
/// <remarks>
/// Use Cases:
/// - Redundant sensor voting (2-out-of-3 logic for safety systems)
/// - Equipment status monitoring (all pumps running? any alarm active?)
/// - Interlock conditions (multiple conditions must be true)
/// - Complex alarm conditions with hysteresis
/// - Safety logic with configurable voting thresholds
/// 
/// Features:
/// - Multiple comparison groups combined with AND/OR/XOR
/// - N-out-of-M voting per group
/// - Analog threshold comparisons (>, <, ==, !=, Between)
/// - Digital value comparisons (0/1)
/// - Threshold hysteresis (for analog comparisons)
/// - Voting hysteresis (for vote count changes)
/// </remarks>
[Table("comparison_memory")]
public class ComparisonMemory
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    /// <summary>
    /// Optional name/description for this comparison memory configuration.
    /// </summary>
    [Column("name")]
    public string? Name { get; set; }

    /// <summary>
    /// JSON array of comparison groups. Each group has its own inputs and voting logic.
    /// Format: [{"inputItemIds": ["guid1", "guid2"], "requiredVotes": 2, ...}, ...]
    /// See ComparisonGroup for full structure.
    /// </summary>
    [Column("comparison_groups")]
    public string ComparisonGroups { get; set; } = "[]";

    /// <summary>
    /// Operator used to combine results from multiple comparison groups.
    /// - AND: All groups must evaluate to true
    /// - OR: At least one group must evaluate to true
    /// - XOR: Exactly one group must evaluate to true
    /// Default: AND
    /// </summary>
    [DefaultValue(GroupOperator.And)]
    [Column("group_operator")]
    public GroupOperator GroupOperator { get; set; } = GroupOperator.And;

    /// <summary>
    /// The DigitalOutput item that receives the comparison result.
    /// Value "1" = condition met, Value "0" = condition not met.
    /// Must be ItemType.DigitalOutput.
    /// </summary>
    [Column("output_item_id")]
    public Guid OutputItemId { get; set; }

    /// <summary>
    /// Processing interval in seconds. The comparison is evaluated at this frequency.
    /// Default: 1 second for real-time logic evaluation.
    /// </summary>
    [DefaultValue(1)]
    [Column("interval")]
    public int Interval { get; set; } = 1;

    /// <summary>
    /// If true, this comparison memory is disabled and will not be processed.
    /// </summary>
    [DefaultValue(false)]
    [Column("is_disabled")]
    public bool IsDisabled { get; set; } = false;

    /// <summary>
    /// If true, inverts the final output (NOT operation on combined group results).
    /// </summary>
    [DefaultValue(false)]
    [Column("invert_output")]
    public bool InvertOutput { get; set; } = false;

    /// <summary>
    /// Write duration in seconds for controller writes.
    /// Default: 10 seconds. Must be >= 0.
    /// 0 means instant write-and-release for supported interfaces.
    /// </summary>
    [Column("duration")]
    [DefaultValue(10)]
    [Required]
    public long Duration { get; set; } = 10;
}

/// <summary>
/// Operator for combining multiple comparison groups.
/// </summary>
public enum GroupOperator
{
    /// <summary>All groups must evaluate to true (logical AND)</summary>
    And = 1,
    /// <summary>At least one group must evaluate to true (logical OR)</summary>
    Or = 2,
    /// <summary>Exactly one group must evaluate to true (logical XOR)</summary>
    Xor = 3,
}

/// <summary>
/// Comparison mode for determining input types and comparison logic.
/// </summary>
public enum ComparisonMode
{
    /// <summary>
    /// Analog mode: Inputs are analog values compared against numeric thresholds.
    /// Supports all CompareTypes (Equal, NotEqual, Higher, Lower, Between).
    /// </summary>
    Analog = 1,
    /// <summary>
    /// Digital mode: Inputs are digital values compared against 0 or 1.
    /// Only supports Equal comparison (input == digitalValue).
    /// </summary>
    Digital = 2,
}

/// <summary>
/// Represents a single comparison group within a ComparisonMemory.
/// This is stored as JSON within ComparisonMemory.ComparisonGroups.
/// </summary>
public class ComparisonGroup
{
    /// <summary>
    /// Unique identifier for this group (used for UI tracking).
    /// </summary>
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// List of input item GUIDs to evaluate in this group.
    /// </summary>
    public List<string> InputItemIds { get; set; } = new();

    /// <summary>
    /// Number of inputs that must satisfy the comparison condition (N in N-out-of-M).
    /// Must be between 1 and InputItemIds.Count (inclusive).
    /// Example: requiredVotes=2, inputItemIds.Count=3 means "2-out-of-3" voting.
    /// </summary>
    public int RequiredVotes { get; set; } = 1;

    /// <summary>
    /// Comparison mode (Analog or Digital).
    /// Determines input filtering and available comparison operators.
    /// </summary>
    public ComparisonMode ComparisonMode { get; set; } = ComparisonMode.Digital;

    /// <summary>
    /// Comparison type for threshold comparison.
    /// For Analog mode: All types available (Equal, NotEqual, Higher, Lower, Between).
    /// For Digital mode: Only Equal is used (compare against DigitalValue).
    /// </summary>
    public int CompareType { get; set; } = 1; // Default: Equal

    /// <summary>
    /// Primary threshold value for analog comparisons.
    /// Used for: Equal (==), NotEqual (!=), Higher (>), Lower (<), Between (lower bound).
    /// </summary>
    public double? Threshold1 { get; set; }

    /// <summary>
    /// Secondary threshold value for Between comparison (upper bound).
    /// Only used when CompareType is Between.
    /// </summary>
    public double? Threshold2 { get; set; }

    /// <summary>
    /// Hysteresis value for analog threshold comparisons.
    /// Prevents output flapping near threshold boundaries.
    /// Example: Threshold1=100, ThresholdHysteresis=5
    /// - Turns ON when value > 100 + 5 = 105
    /// - Turns OFF when value < 100 - 5 = 95
    /// Default: 0 (no hysteresis).
    /// </summary>
    public double ThresholdHysteresis { get; set; } = 0;

    /// <summary>
    /// Hysteresis value for voting count.
    /// Prevents output flapping when vote count is near the threshold.
    /// Example: RequiredVotes=2, VotingHysteresis=1
    /// - Turns ON when votes >= 2 + 1 = 3
    /// - Turns OFF when votes < 2 - 1 = 1
    /// Default: 0 (no hysteresis, uses exact RequiredVotes).
    /// </summary>
    public int VotingHysteresis { get; set; } = 0;

    /// <summary>
    /// Digital value to compare against (for Digital mode).
    /// "0" = check for false/off, "1" = check for true/on.
    /// </summary>
    public string? DigitalValue { get; set; } = "1";

    /// <summary>
    /// Optional name/description for this group.
    /// </summary>
    public string? Name { get; set; }
}
