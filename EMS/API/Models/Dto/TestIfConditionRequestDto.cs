using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for testing an IF condition expression
/// </summary>
public class TestIfConditionRequestDto
{
    /// <summary>
    /// The NCalc condition expression to test.
    /// Example: "[temperature] >= 50 && [pressure] < 100"
    /// </summary>
    [Required(ErrorMessage = "Condition is required")]
    [StringLength(2000, ErrorMessage = "Condition must not exceed 2000 characters")]
    public string Condition { get; set; } = "";

    /// <summary>
    /// List of variable alias to item ID mappings for fetching real values
    /// </summary>
    public List<VariableAliasDto>? VariableAliases { get; set; }
}
