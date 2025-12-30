using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

/// <summary>
/// Formula/Expression Memory for evaluating custom mathematical expressions using NCalc.
/// Supports multiple analog inputs mapped to variable aliases and outputs computed result.
/// </summary>
/// <remarks>
/// Use Cases:
/// - Complex calculations (density, enthalpy, power factor)
/// - Unit conversions (e.g., 4-20mA to engineering units)
/// - Custom engineering formulas (heat transfer, efficiency)
/// - Multi-variable relationships (weighted averages, ratios)
/// - Efficiency calculations (output/input ratios)
/// 
/// Features:
/// - Safe NCalc expression parser with standard math functions
/// - Built-in functions: sin, cos, tan, log, log10, exp, sqrt, abs, round, floor, ceiling
/// - Custom functions: avg, min, max, clamp, scale, deadband, iff
/// - Variable aliases mapped to input point values
/// - Compiled expression caching for performance
/// - Expression validation with descriptive error messages
/// </remarks>
[Table("formula_memory")]
public class FormulaMemory
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    /// <summary>
    /// Optional name/description for this formula memory configuration.
    /// </summary>
    [Column("name")]
    public string? Name { get; set; }

    /// <summary>
    /// The NCalc expression to evaluate. Variables are referenced using [alias] syntax.
    /// Example: "([v1] + [v2]) / 2" or "scale([temperature], 4, 20, 0, 100)"
    /// </summary>
    [Column("expression")]
    public string Expression { get; set; } = "";

    /// <summary>
    /// JSON object mapping variable aliases to input item GUIDs.
    /// Format: {"v1": "guid1", "v2": "guid2", "temperature": "guid3"}
    /// Aliases are used in the expression with [alias] syntax.
    /// </summary>
    [Column("variable_aliases")]
    public string VariableAliases { get; set; } = "{}";

    /// <summary>
    /// The AnalogOutput item that receives the computed result.
    /// Must be ItemType.AnalogOutput.
    /// </summary>
    [Column("output_item_id")]
    public Guid OutputItemId { get; set; }

    /// <summary>
    /// Processing interval in seconds. The expression is evaluated at this frequency.
    /// Default: 10 seconds.
    /// </summary>
    [DefaultValue(10)]
    [Column("interval")]
    public int Interval { get; set; } = 10;

    /// <summary>
    /// If true, this formula memory is disabled and will not be processed.
    /// </summary>
    [DefaultValue(false)]
    [Column("is_disabled")]
    public bool IsDisabled { get; set; } = false;

    /// <summary>
    /// Number of decimal places for formatting output value.
    /// Range: 0 to 10. Default: 2.
    /// </summary>
    [DefaultValue(2)]
    [Column("decimal_places")]
    public int DecimalPlaces { get; set; } = 2;

    /// <summary>
    /// Optional display units for the output (e.g., "°C", "kW", "kg/m³").
    /// For documentation purposes only.
    /// </summary>
    [Column("units")]
    public string? Units { get; set; }

    /// <summary>
    /// Optional description of what this formula calculates.
    /// For documentation and UI display.
    /// </summary>
    [Column("description")]
    public string? Description { get; set; }

    /// <summary>
    /// Hash of the expression string for cache invalidation.
    /// Updated when expression is modified.
    /// </summary>
    [Column("expression_hash")]
    public string? ExpressionHash { get; set; }

    /// <summary>
    /// Last successful evaluation timestamp (Unix epoch seconds).
    /// </summary>
    [Column("last_evaluation_time")]
    public long? LastEvaluationTime { get; set; }

    /// <summary>
    /// Last error message if evaluation failed.
    /// Null if last evaluation was successful.
    /// </summary>
    [Column("last_error")]
    public string? LastError { get; set; }
}

/// <summary>
/// DTO for variable alias mapping in FormData
/// </summary>
public class VariableAlias
{
    public string Alias { get; set; } = "";
    public Guid ItemId { get; set; }
}
