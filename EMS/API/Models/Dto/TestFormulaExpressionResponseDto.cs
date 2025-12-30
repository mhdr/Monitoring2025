namespace API.Models.Dto;

/// <summary>
/// Response DTO for testing/previewing a formula expression
/// </summary>
public class TestFormulaExpressionResponseDto
{
    /// <summary>
    /// Whether the expression evaluation was successful
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// The computed result (if successful)
    /// </summary>
    public double? Result { get; set; }

    /// <summary>
    /// Error message if evaluation failed (syntax error, undefined variable, etc.)
    /// </summary>
    public string? ErrorMessage { get; set; }
}
