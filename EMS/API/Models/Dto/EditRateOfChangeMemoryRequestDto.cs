using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for editing a rate of change memory configuration
/// </summary>
public class EditRateOfChangeMemoryRequestDto
{
    /// <summary>
    /// ID of the rate of change memory to edit
    /// </summary>
    [Required(ErrorMessage = "ID is required")]
    public Guid Id { get; set; }

    /// <summary>
    /// Human-readable name for the rate of change memory
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// ID of the input monitoring item (must be AnalogInput or AnalogOutput)
    /// </summary>
    [Required(ErrorMessage = "Input item ID is required")]
    public Guid InputItemId { get; set; }

    /// <summary>
    /// ID of the output monitoring item for rate value (must be AnalogOutput)
    /// </summary>
    [Required(ErrorMessage = "Output item ID is required")]
    public Guid OutputItemId { get; set; }

    /// <summary>
    /// ID of the optional alarm output item (must be DigitalOutput)
    /// </summary>
    public Guid? AlarmOutputItemId { get; set; }

    /// <summary>
    /// Execution interval in seconds
    /// </summary>
    [Required(ErrorMessage = "Interval is required")]
    [Range(1, int.MaxValue, ErrorMessage = "Interval must be greater than 0")]
    public int Interval { get; set; } = 10;

    /// <summary>
    /// Whether the memory is disabled
    /// </summary>
    public bool IsDisabled { get; set; } = false;

    /// <summary>
    /// Rate calculation method (1=SimpleDifference, 2=MovingAverage, 3=WeightedAverage, 4=LinearRegression)
    /// </summary>
    [Required(ErrorMessage = "Calculation method is required")]
    [Range(1, 4, ErrorMessage = "Calculation method must be 1-4")]
    public int CalculationMethod { get; set; } = 1;

    /// <summary>
    /// Time window in seconds for moving average/regression calculations
    /// </summary>
    [Required(ErrorMessage = "Time window is required")]
    [Range(1, int.MaxValue, ErrorMessage = "Time window must be greater than 0")]
    public int TimeWindowSeconds { get; set; } = 60;

    /// <summary>
    /// Exponential smoothing filter coefficient (0-1)
    /// </summary>
    [Range(0.0, 1.0, ErrorMessage = "Smoothing filter alpha must be between 0 and 1")]
    public double SmoothingFilterAlpha { get; set; } = 0.2;

    /// <summary>
    /// High rate threshold for alarm triggering
    /// </summary>
    public double? HighRateThreshold { get; set; }

    /// <summary>
    /// Low rate threshold for alarm triggering
    /// </summary>
    public double? LowRateThreshold { get; set; }

    /// <summary>
    /// Hysteresis multiplier for high rate alarm clearing (0-1)
    /// </summary>
    [Range(0.01, 1.0, ErrorMessage = "High rate hysteresis must be between 0 (exclusive) and 1")]
    public double HighRateHysteresis { get; set; } = 0.9;

    /// <summary>
    /// Hysteresis multiplier for low rate alarm clearing (0-1)
    /// </summary>
    [Range(0.01, 1.0, ErrorMessage = "Low rate hysteresis must be between 0 (exclusive) and 1")]
    public double LowRateHysteresis { get; set; } = 0.9;

    /// <summary>
    /// Number of samples to ignore during baseline establishment
    /// </summary>
    [Range(0, int.MaxValue, ErrorMessage = "Baseline sample count must be 0 or greater")]
    public int BaselineSampleCount { get; set; } = 3;

    /// <summary>
    /// Time unit for rate output (1=PerSecond, 60=PerMinute, 3600=PerHour)
    /// </summary>
    [Required(ErrorMessage = "Time unit is required")]
    public int TimeUnit { get; set; } = 60;

    /// <summary>
    /// Display unit string for the rate (e.g., "°C/min")
    /// </summary>
    public string? RateUnitDisplay { get; set; }

    /// <summary>
    /// Number of decimal places for output value rounding
    /// </summary>
    [Range(0, 10, ErrorMessage = "Decimal places must be between 0 and 10")]
    public int DecimalPlaces { get; set; } = 2;
}
