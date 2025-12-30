namespace API.Models.Dto;

/// <summary>
/// Response DTO for testing an IF condition expression
/// </summary>
public class TestIfConditionResponseDto
{
    /// <summary>
    /// Whether the test was successful (condition was evaluated without errors)
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// The result of the condition evaluation (true or false)
    /// </summary>
    public bool? Result { get; set; }

    /// <summary>
    /// Error message if evaluation failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}
