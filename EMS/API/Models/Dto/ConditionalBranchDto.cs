namespace API.Models.Dto;

/// <summary>
/// Represents a conditional branch within an IF memory
/// </summary>
public class ConditionalBranchDto
{
    /// <summary>
    /// Unique identifier for this branch (used for UI tracking)
    /// </summary>
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// Order of evaluation (0-based). Lower values are evaluated first.
    /// </summary>
    public int Order { get; set; } = 0;

    /// <summary>
    /// NCalc condition expression that must evaluate to true for this branch.
    /// Uses [alias] syntax to reference input variables.
    /// Example: "[temperature] >= 50 &amp;&amp; [pressure] &lt; 100"
    /// </summary>
    public string Condition { get; set; } = "";

    /// <summary>
    /// Value to output when this branch's condition evaluates to true.
    /// For Digital output: 0 = off, non-zero = on.
    /// For Analog output: used as-is.
    /// </summary>
    public double OutputValue { get; set; } = 1;

    /// <summary>
    /// Optional hysteresis for analog threshold comparisons (0 = no hysteresis)
    /// </summary>
    public double Hysteresis { get; set; } = 0;

    /// <summary>
    /// Optional name/label for this branch (for UI display)
    /// </summary>
    public string? Name { get; set; }
}
