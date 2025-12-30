using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for editing an existing comparison memory configuration
/// </summary>
public class EditComparisonMemoryRequestDto
{
    /// <summary>
    /// ID of the comparison memory to edit
    /// </summary>
    [Required(ErrorMessage = "ID is required")]
    public Guid Id { get; set; }

    /// <summary>
    /// Human-readable name for the comparison memory
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// JSON array of comparison groups
    /// </summary>
    [Required(ErrorMessage = "Comparison groups are required")]
    public string ComparisonGroups { get; set; } = "[]";

    /// <summary>
    /// Operator used to combine group results (1=AND, 2=OR, 3=XOR)
    /// </summary>
    [Range(1, 3, ErrorMessage = "Group operator must be 1 (AND), 2 (OR), or 3 (XOR)")]
    public int GroupOperator { get; set; } = 1;

    /// <summary>
    /// ID of the output monitoring item (must be DigitalOutput)
    /// </summary>
    [Required(ErrorMessage = "Output item ID is required")]
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
}
