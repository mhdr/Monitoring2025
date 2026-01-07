using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for creating a new deadband memory configuration
/// </summary>
public class AddDeadbandMemoryRequestDto
{
    /// <summary>
    /// Human-readable name for the deadband memory
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Type of the input source: 0=Point, 1=GlobalVariable
    /// </summary>
    [Range(0, 1, ErrorMessage = "Input type must be 0 (Point) or 1 (GlobalVariable)")]
    public int InputType { get; set; } = 0;
    
    /// <summary>
    /// Reference to the input source (GUID string for Point, name for GlobalVariable)
    /// </summary>
    [Required(ErrorMessage = "Input reference is required")]
    public string InputReference { get; set; } = string.Empty;
    
    /// <summary>
    /// Type of the output source: 0=Point, 1=GlobalVariable
    /// </summary>
    [Range(0, 1, ErrorMessage = "Output type must be 0 (Point) or 1 (GlobalVariable)")]
    public int OutputType { get; set; } = 0;
    
    /// <summary>
    /// Reference to the output source (GUID string for Point, name for GlobalVariable)
    /// </summary>
    [Required(ErrorMessage = "Output reference is required")]
    public string OutputReference { get; set; } = string.Empty;

    /// <summary>
    /// [DEPRECATED] ID of the input monitoring item - Use InputReference and InputType instead
    /// </summary>
    public Guid InputItemId { get; set; }

    /// <summary>
    /// [DEPRECATED] ID of the output monitoring item - Use OutputReference and OutputType instead
    /// </summary>
    public Guid OutputItemId { get; set; }

    /// <summary>
    /// Execution interval in seconds
    /// </summary>
    [Required(ErrorMessage = "Interval is required")]
    [Range(1, int.MaxValue, ErrorMessage = "Interval must be greater than 0")]
    public int Interval { get; set; } = 1;

    /// <summary>
    /// Whether the memory is disabled
    /// </summary>
    public bool IsDisabled { get; set; } = false;

    /// <summary>
    /// Deadband threshold value for analog inputs
    /// - Absolute: fixed value threshold (e.g., 0.5 means ±0.5 units)
    /// - Percentage: percentage of span (e.g., 1.0 means 1% of input range)
    /// - RateOfChange: rate threshold in units/second
    /// </summary>
    [Range(0.0, double.MaxValue, ErrorMessage = "Deadband must be 0 or greater")]
    public double Deadband { get; set; } = 0.0;

    /// <summary>
    /// Type of deadband calculation for analog inputs (0=Absolute, 1=Percentage, 2=RateOfChange)
    /// </summary>
    [Range(0, 2, ErrorMessage = "Deadband type must be 0-2")]
    public int DeadbandType { get; set; } = 0;

    /// <summary>
    /// Minimum value of input range (used for Percentage deadband calculation)
    /// </summary>
    public double InputMin { get; set; } = 0.0;

    /// <summary>
    /// Maximum value of input range (used for Percentage deadband calculation)
    /// </summary>
    public double InputMax { get; set; } = 100.0;

    /// <summary>
    /// Stability time in seconds for digital inputs
    /// Digital input must remain stable for this duration before output changes
    /// </summary>
    [Range(0.0, double.MaxValue, ErrorMessage = "Stability time must be 0 or greater")]
    public double StabilityTime { get; set; } = 1.0;
}
