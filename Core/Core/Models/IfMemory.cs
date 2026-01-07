using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

/// <summary>
/// IF Memory for evaluating conditional expressions with IF/ELSE IF/ELSE branching logic.
/// Evaluates NCalc conditions in order and outputs the value of the first matching branch.
/// Supports both Digital (0/1) and Analog (numeric) output modes.
/// </summary>
/// <remarks>
/// Use Cases:
/// - Conditional output based on multiple criteria (temperature ranges → speed settings)
/// - State machine logic (state A → output 1, state B → output 2, else → output 0)
/// - Multi-threshold alarms (low/medium/high severity based on value ranges)
/// - Priority-based logic (first condition wins)
/// - Complex decision trees with AND/OR operators
/// 
/// Features:
/// - Ordered IF/ELSE IF/ELSE branches evaluated sequentially
/// - NCalc expression engine with comparison operators (>=, <=, ==, !=, >, <)
/// - Logical operators (&&, ||, !) for compound conditions
/// - Per-branch hysteresis for analog threshold comparisons
/// - Support for Digital (0/1) and Analog (numeric) output modes
/// - Variable aliases mapped to input point values
/// - Maximum 20 branches per memory
/// </remarks>
[Table("if_memory")]
public class IfMemory
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    /// <summary>
    /// Optional name/description for this IF memory configuration.
    /// </summary>
    [Column("name")]
    public string? Name { get; set; }

    /// <summary>
    /// JSON array of conditional branches evaluated in order.
    /// First branch whose condition evaluates to true determines the output.
    /// Format: [{"id": "guid", "order": 0, "condition": "[v1] >= 10", "outputValue": 1.0, "hysteresis": 0.5, "name": "High"}, ...]
    /// Maximum 20 branches allowed.
    /// </summary>
    [Column("branches")]
    public string Branches { get; set; } = "[]";

    /// <summary>
    /// Default output value when no branch condition matches (ELSE branch).
    /// For Digital output: typically 0 (off/false).
    /// For Analog output: user-defined numeric value.
    /// </summary>
    [DefaultValue(0)]
    [Column("default_value")]
    public double DefaultValue { get; set; } = 0;

    /// <summary>
    /// JSON object mapping variable aliases to input item GUIDs.
    /// Format: {"v1": "guid1", "v2": "guid2", "temperature": "guid3"}
    /// Aliases are used in conditions with [alias] syntax.
    /// </summary>
    [Column("variable_aliases")]
    public string VariableAliases { get; set; } = "{}";

    /// <summary>
    /// Type of the output destination: Point or GlobalVariable
    /// </summary>
    [Column("output_destination_type")]
    public TimeoutSourceType OutputDestinationType { get; set; } = TimeoutSourceType.Point;

    /// <summary>
    /// Reference to the output destination:
    /// - If OutputDestinationType = Point: GUID string of the MonitoringItem (DigitalOutput or AnalogOutput)
    /// - If OutputDestinationType = GlobalVariable: Name of the Global Variable
    /// </summary>
    [Column("output_reference")]
    public string OutputReference { get; set; } = string.Empty;

    /// <summary>
    /// DEPRECATED: Use OutputDestinationType and OutputReference instead.
    /// The output item that receives the computed result.
    /// For Digital mode: must be ItemType.DigitalOutput.
    /// For Analog mode: must be ItemType.AnalogOutput.
    /// Kept for backward compatibility with existing database records.
    /// </summary>
    [Column("output_item_id")]
    public Guid? OutputItemId { get; set; }

    /// <summary>
    /// Output type determining how values are written.
    /// Digital: clamps output to 0 or 1.
    /// Analog: writes numeric value directly.
    /// </summary>
    [DefaultValue(IfMemoryOutputType.Digital)]
    [Column("output_type")]
    public IfMemoryOutputType OutputType { get; set; } = IfMemoryOutputType.Digital;

    /// <summary>
    /// Processing interval in seconds. Conditions are evaluated at this frequency.
    /// Default: 1 second for real-time logic evaluation.
    /// </summary>
    [DefaultValue(1)]
    [Column("interval")]
    public int Interval { get; set; } = 1;

    /// <summary>
    /// If true, this IF memory is disabled and will not be processed.
    /// </summary>
    [DefaultValue(false)]
    [Column("is_disabled")]
    public bool IsDisabled { get; set; } = false;

    /// <summary>
    /// Optional description of what this IF memory evaluates.
    /// For documentation and UI display.
    /// </summary>
    [Column("description")]
    public string? Description { get; set; }
}

/// <summary>
/// Output type for IF Memory determining how values are written.
/// </summary>
public enum IfMemoryOutputType
{
    /// <summary>
    /// Digital mode: Output is clamped to 0 (false/off) or 1 (true/on).
    /// Any outputValue != 0 becomes 1, outputValue == 0 becomes 0.
    /// </summary>
    Digital = 0,

    /// <summary>
    /// Analog mode: Output value is written directly as a numeric value.
    /// Supports any numeric value (integer or decimal).
    /// </summary>
    Analog = 1,
}

/// <summary>
/// Represents a single conditional branch within an IfMemory.
/// This is stored as JSON within IfMemory.Branches.
/// Branches are evaluated in order by their Order property.
/// </summary>
public class ConditionalBranch
{
    /// <summary>
    /// Unique identifier for this branch (used for UI tracking and hysteresis state).
    /// </summary>
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// Order of evaluation (0-based). Lower values are evaluated first.
    /// Must be unique within the parent IfMemory's branch list.
    /// </summary>
    public int Order { get; set; } = 0;

    /// <summary>
    /// NCalc condition expression that must evaluate to true for this branch.
    /// Uses [alias] syntax to reference input variables.
    /// Supports comparison operators: >=, <=, ==, !=, >, <
    /// Supports logical operators: && (AND), || (OR), ! (NOT)
    /// Example: "[temperature] >= 50 && [pressure] < 100"
    /// Required: cannot be empty.
    /// </summary>
    public string Condition { get; set; } = "";

    /// <summary>
    /// Value to output when this branch's condition evaluates to true.
    /// For Digital output mode: 0 = off, any non-zero = on (treated as 1).
    /// For Analog output mode: used as-is (numeric value).
    /// </summary>
    public double OutputValue { get; set; } = 1;

    /// <summary>
    /// Optional hysteresis for analog threshold comparisons in this branch.
    /// Prevents output flapping near threshold boundaries.
    /// Applied to numeric comparisons within the condition.
    /// Default: 0 (no hysteresis).
    /// </summary>
    public double Hysteresis { get; set; } = 0;

    /// <summary>
    /// Optional name/label for this branch (for UI display).
    /// Example: "High", "Medium", "Low", "Critical"
    /// </summary>
    public string? Name { get; set; }
}
