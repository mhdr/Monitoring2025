using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

/// <summary>
/// Rate calculation methods for derivative computation
/// </summary>
public enum RateCalculationMethod
{
    /// <summary>
    /// Simple difference: (current - last) / deltaTime
    /// Fast but sensitive to noise
    /// </summary>
    SimpleDifference = 1,
    
    /// <summary>
    /// Moving average of derivatives over time window
    /// Reduces noise but introduces lag
    /// </summary>
    MovingAverage = 2,
    
    /// <summary>
    /// Weighted moving average with exponential decay (recent samples weighted higher)
    /// Balance between noise reduction and responsiveness
    /// </summary>
    WeightedAverage = 3,
    
    /// <summary>
    /// Least-squares linear regression over time window
    /// Best for noisy data, requires minimum 5 samples
    /// </summary>
    LinearRegression = 4
}

/// <summary>
/// Time unit for rate output conversion
/// Value represents multiplier from per-second to target unit
/// </summary>
public enum RateTimeUnit
{
    /// <summary>
    /// Rate per second (multiplier = 1)
    /// </summary>
    PerSecond = 1,
    
    /// <summary>
    /// Rate per minute (multiplier = 60)
    /// </summary>
    PerMinute = 60,
    
    /// <summary>
    /// Rate per hour (multiplier = 3600)
    /// </summary>
    PerHour = 3600
}

/// <summary>
/// Rate of Change Memory for calculating derivatives of analog values
/// Use cases: Temperature rise/fall rate, pressure change rate, leak detection, predictive alerts
/// </summary>
[Table("rate_of_change_memory")]
public class RateOfChangeMemory
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    
    /// <summary>
    /// Optional human-readable name for the rate of change memory
    /// </summary>
    [Column("name")]
    public string? Name { get; set; }

    /// <summary>
    /// Input monitoring item ID (must be AnalogInput or AnalogOutput)
    /// </summary>
    [Column("input_item_id")]
    public Guid InputItemId { get; set; }
    
    /// <summary>
    /// Output monitoring item ID where calculated rate is written (must be AnalogOutput)
    /// </summary>
    [Column("output_item_id")]
    public Guid OutputItemId { get; set; }
    
    /// <summary>
    /// Optional alarm output item ID for threshold violations (must be DigitalOutput)
    /// </summary>
    [Column("alarm_output_item_id")]
    public Guid? AlarmOutputItemId { get; set; }

    /// <summary>
    /// Processing interval in seconds
    /// </summary>
    [DefaultValue(10)]
    [Column("interval")]
    public int Interval { get; set; } = 10;

    /// <summary>
    /// Enable/disable flag for processing
    /// </summary>
    [DefaultValue(false)]
    [Column("is_disabled")]
    public bool IsDisabled { get; set; } = false;
    
    /// <summary>
    /// Method used for rate calculation
    /// </summary>
    [DefaultValue(RateCalculationMethod.SimpleDifference)]
    [Column("calculation_method")]
    public RateCalculationMethod CalculationMethod { get; set; } = RateCalculationMethod.SimpleDifference;
    
    /// <summary>
    /// Time window in seconds for moving average/regression calculations
    /// Larger windows provide smoother output but more lag
    /// </summary>
    [DefaultValue(60)]
    [Column("time_window_seconds")]
    public int TimeWindowSeconds { get; set; } = 60;
    
    /// <summary>
    /// Exponential smoothing filter coefficient (0-1)
    /// 0 = no smoothing (raw), 1 = maximum smoothing (very slow response)
    /// Recommended: 0.1-0.3 for moderate smoothing
    /// </summary>
    [DefaultValue(0.2)]
    [Column("smoothing_filter_alpha")]
    public double SmoothingFilterAlpha { get; set; } = 0.2;
    
    /// <summary>
    /// High rate threshold for alarm triggering (in output units)
    /// Alarm triggers when rate exceeds this value
    /// Null = no high rate alarm
    /// </summary>
    [Column("high_rate_threshold")]
    public double? HighRateThreshold { get; set; }
    
    /// <summary>
    /// Low rate threshold for alarm triggering (in output units)
    /// Alarm triggers when rate drops below this value
    /// Null = no low rate alarm
    /// </summary>
    [Column("low_rate_threshold")]
    public double? LowRateThreshold { get; set; }
    
    /// <summary>
    /// Hysteresis multiplier for high rate alarm clearing (0-1)
    /// Alarm clears when rate drops below HighRateThreshold * HighRateHysteresis
    /// Example: 0.9 means alarm clears at 90% of threshold
    /// </summary>
    [DefaultValue(0.9)]
    [Column("high_rate_hysteresis")]
    public double HighRateHysteresis { get; set; } = 0.9;
    
    /// <summary>
    /// Hysteresis multiplier for low rate alarm clearing (0-1)
    /// Alarm clears when rate rises above LowRateThreshold / LowRateHysteresis
    /// Example: 0.9 means alarm clears at 111% of threshold (1/0.9)
    /// </summary>
    [DefaultValue(0.9)]
    [Column("low_rate_hysteresis")]
    public double LowRateHysteresis { get; set; } = 0.9;
    
    /// <summary>
    /// Current alarm state for hysteresis tracking
    /// true = high alarm active, false = low alarm active, null = no alarm
    /// </summary>
    [Column("alarm_state")]
    public bool? AlarmState { get; set; }
    
    /// <summary>
    /// Number of samples to ignore during baseline establishment
    /// Rate calculation begins after this many samples are collected
    /// </summary>
    [DefaultValue(3)]
    [Column("baseline_sample_count")]
    public int BaselineSampleCount { get; set; } = 3;
    
    /// <summary>
    /// Counter for samples accumulated during baseline phase
    /// </summary>
    [DefaultValue(0)]
    [Column("accumulated_samples")]
    public int AccumulatedSamples { get; set; } = 0;
    
    /// <summary>
    /// Time unit for rate output (per second, per minute, per hour)
    /// </summary>
    [DefaultValue(RateTimeUnit.PerMinute)]
    [Column("time_unit")]
    public RateTimeUnit TimeUnit { get; set; } = RateTimeUnit.PerMinute;
    
    /// <summary>
    /// Display unit string for the rate (e.g., "°C/min", "psi/hr", "m³/s")
    /// </summary>
    [Column("rate_unit_display")]
    public string? RateUnitDisplay { get; set; }
    
    /// <summary>
    /// Number of decimal places for output value rounding
    /// </summary>
    [DefaultValue(2)]
    [Column("decimal_places")]
    public int DecimalPlaces { get; set; } = 2;
    
    /// <summary>
    /// Last calculated smoothed rate (for exponential filter continuity)
    /// </summary>
    [Column("last_smoothed_rate")]
    public double? LastSmoothedRate { get; set; }
    
    /// <summary>
    /// Last input value for simple difference calculation
    /// </summary>
    [Column("last_input_value")]
    public double? LastInputValue { get; set; }
    
    /// <summary>
    /// Timestamp of last input reading (Unix epoch seconds)
    /// </summary>
    [Column("last_timestamp")]
    public long? LastTimestamp { get; set; }
    
    /// <summary>
    /// Navigation property for sample history (stored in separate table for performance)
    /// </summary>
    public virtual ICollection<RateOfChangeSample>? Samples { get; set; }
}
