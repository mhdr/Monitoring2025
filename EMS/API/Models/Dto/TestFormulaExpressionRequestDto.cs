using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for testing/previewing a formula expression
/// </summary>
public class TestFormulaExpressionRequestDto
{
    /// <summary>
    /// The NCalc expression to evaluate
    /// </summary>
    [Required(ErrorMessage = "Expression is required")]
    [StringLength(2000, ErrorMessage = "Expression must not exceed 2000 characters")]
    public string Expression { get; set; } = "";

    /// <summary>
    /// List of variable alias to item ID mappings for fetching real values
    /// </summary>
    public List<VariableAliasDto>? VariableAliases { get; set; }
}
