using System.ComponentModel.DataAnnotations;
using Core.Models;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for creating a new formula memory configuration
/// </summary>
public class AddFormulaMemoryRequestDto
{
    /// <summary>
    /// Human-readable name for the formula memory
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// The NCalc expression to evaluate.
    /// Variables are referenced using [alias] syntax.
    /// Example: "([v1] + [v2]) / 2" or "scale([temperature], 4, 20, 0, 100)"
    /// </summary>
    [Required(ErrorMessage = "Expression is required")]
    [StringLength(2000, ErrorMessage = "Expression must not exceed 2000 characters")]
    public string Expression { get; set; } = "";

    /// <summary>
    /// JSON object mapping variable aliases to input item GUIDs.
    /// Format: {"v1": "guid1", "v2": "guid2", "temperature": "guid3"}
    /// Aliases are used in the expression with [alias] syntax.
    /// </summary>
    [Required(ErrorMessage = "Variable aliases are required")]
    public string VariableAliases { get; set; } = "{}";

    /// <summary>
    /// Type of the output destination: Point or GlobalVariable
    /// </summary>
    public TimeoutSourceType OutputType { get; set; } = TimeoutSourceType.Point;

    /// <summary>
    /// Reference to the output destination:
    /// - If OutputType = Point: GUID string of the AnalogOutput MonitoringItem
    /// - If OutputType = GlobalVariable: Name of the Global Variable (Float type)
    /// </summary>
    [Required(ErrorMessage = "Output reference is required")]
    public string OutputReference { get; set; } = string.Empty;

    /// <summary>
    /// DEPRECATED: Use OutputType and OutputReference instead.
    /// ID of the output monitoring item to write computed result to.
    /// Kept for backward compatibility.
    /// </summary>
    public Guid? OutputItemId { get; set; }

    /// <summary>
    /// Execution interval in seconds (must be greater than 0)
    /// </summary>
    [Required(ErrorMessage = "Interval is required")]
    [Range(1, int.MaxValue, ErrorMessage = "Interval must be greater than 0")]
    public int Interval { get; set; } = 10;

    /// <summary>
    /// Whether the formula memory is disabled
    /// </summary>
    public bool IsDisabled { get; set; } = false;

    /// <summary>
    /// Number of decimal places for formatting output value (0-10)
    /// </summary>
    [Range(0, 10, ErrorMessage = "Decimal places must be between 0 and 10")]
    public int DecimalPlaces { get; set; } = 2;

    /// <summary>
    /// Optional display units for the output (e.g., "°C", "kW", "kg/m³")
    /// </summary>
    public string? Units { get; set; }

    /// <summary>
    /// Optional description of what this formula calculates
    /// </summary>
    public string? Description { get; set; }
}
