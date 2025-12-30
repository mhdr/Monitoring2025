using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for editing an IF memory configuration
/// </summary>
public class EditIfMemoryRequestDto
{
    /// <summary>
    /// ID of the IF memory to edit
    /// </summary>
    [Required(ErrorMessage = "IF memory ID is required")]
    public Guid Id { get; set; }

    /// <summary>
    /// Human-readable name for the IF memory
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// JSON array of conditional branches evaluated in order.
    /// Maximum 20 branches allowed.
    /// </summary>
    [Required(ErrorMessage = "Branches are required")]
    public string Branches { get; set; } = "[]";

    /// <summary>
    /// Default output value when no branch condition matches (ELSE branch).
    /// </summary>
    public double DefaultValue { get; set; } = 0;

    /// <summary>
    /// JSON object mapping variable aliases to input item GUIDs.
    /// </summary>
    [Required(ErrorMessage = "Variable aliases are required")]
    public string VariableAliases { get; set; } = "{}";

    /// <summary>
    /// ID of the output monitoring item to write result to.
    /// </summary>
    [Required(ErrorMessage = "Output item ID is required")]
    public Guid OutputItemId { get; set; }

    /// <summary>
    /// Output type: 0 = Digital (0/1), 1 = Analog (numeric)
    /// </summary>
    public int OutputType { get; set; } = 0;

    /// <summary>
    /// Execution interval in seconds (must be greater than 0)
    /// </summary>
    [Required(ErrorMessage = "Interval is required")]
    [Range(1, int.MaxValue, ErrorMessage = "Interval must be greater than 0")]
    public int Interval { get; set; } = 1;

    /// <summary>
    /// Whether the IF memory is disabled
    /// </summary>
    public bool IsDisabled { get; set; } = false;

    /// <summary>
    /// Optional description
    /// </summary>
    public string? Description { get; set; }
}
