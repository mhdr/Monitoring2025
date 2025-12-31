using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Core.Libs;

namespace Core.Models;

/// <summary>
/// Type of moving average algorithm to apply
/// </summary>
public enum MovingAverageType
{
    /// <summary>
    /// Simple Moving Average (SMA): Equal weight to all samples in window.
    /// Output = (x1 + x2 + ... + xn) / n
    /// Best for: General smoothing, trend analysis
    /// </summary>
    Simple = 0,
    
    /// <summary>
    /// Exponential Moving Average (EMA): Exponential decay weight giving more importance to recent values.
    /// Output = α × current + (1 - α) × previous_ema
    /// Best for: Responsive smoothing, tracking recent changes
    /// </summary>
    Exponential = 1,
    
    /// <summary>
    /// Weighted Moving Average (WMA): Linear or custom weights.
    /// When using linear weights, most recent sample has highest weight.
    /// Output = (w1×x1 + w2×x2 + ... + wn×xn) / (w1 + w2 + ... + wn)
    /// Best for: Emphasizing recent values with predictable decay
    /// </summary>
    Weighted = 2
}

/// <summary>
/// Represents a moving average/filter memory configuration for signal smoothing and noise reduction.
/// Supports Simple Moving Average (SMA), Exponential Moving Average (EMA), and Weighted Moving Average (WMA).
/// </summary>
/// <remarks>
/// The AverageMemoryProcess performs the following operations:
/// 1. Retrieves current value from input item (single input for time-based moving average)
/// 2. Stores sample in rolling window history
/// 3. Filters out stale values (optional, based on IgnoreStale and StaleTimeout)
/// 4. Detects and removes outliers (optional, using IQR or Z-Score method)
/// 5. Computes moving average based on selected algorithm (SMA/EMA/WMA)
/// 6. Writes the smoothed result to the output item
/// 
/// Use Cases:
/// - Noise reduction on analog signals
/// - Trend smoothing for displays
/// - Dampen oscillations in control systems
/// - Signal conditioning before processing
/// 
/// Input items must be AnalogInput or AnalogOutput type.
/// Output item must be AnalogInput or AnalogOutput type.
/// </remarks>
[Table("average_memory")]
public class AverageMemory
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    /// <summary>
    /// Optional name/description for this average memory configuration.
    /// </summary>
    [Column("name")]
    public string? Name { get; set; }

    /// <summary>
    /// JSON array of input MonitoringItem GUIDs to average.
    /// Format: ["guid1", "guid2", "guid3", ...]
    /// All items must be AnalogInput or AnalogOutput type.
    /// Minimum: 1 item (average of single item returns that value).
    /// No maximum limit - can handle indefinite number of inputs.
    /// </summary>
    [Column("input_item_ids")]
    public string InputItemIds { get; set; } = "[]";

    /// <summary>
    /// The MonitoringItem to receive the computed average value.
    /// Must be AnalogInput or AnalogOutput type.
    /// Cannot be in the InputItemIds list.
    /// </summary>
    [Column("output_item_id")]
    public Guid OutputItemId { get; set; }

    /// <summary>
    /// Processing interval in seconds. The average is recalculated at this frequency.
    /// Default: 10 seconds.
    /// </summary>
    [DefaultValue(10)]
    [Column("interval")]
    public int Interval { get; set; } = 10;

    /// <summary>
    /// If true, this average memory configuration is disabled and will not be processed.
    /// </summary>
    [DefaultValue(false)]
    [Column("is_disabled")]
    public bool IsDisabled { get; set; } = false;

    /// <summary>
    /// Optional JSON array of weights for weighted average calculation.
    /// Format: [1.0, 2.0, 1.5, ...]
    /// - Array length must match InputItemIds length if provided
    /// - All weights must be positive numbers
    /// - If null or empty, equal weights (1.0) are used for all inputs
    /// 
    /// Example: InputItemIds = ["id1", "id2", "id3"], Weights = [1.0, 2.0, 1.0]
    /// Result = (value1 * 1.0 + value2 * 2.0 + value3 * 1.0) / (1.0 + 2.0 + 1.0)
    /// </summary>
    [Column("weights")]
    public string? Weights { get; set; }

    /// <summary>
    /// If true, inputs that haven't been updated within StaleTimeout seconds are ignored
    /// in the average calculation. This prevents old/stale values from affecting the result.
    /// Default: true (recommended).
    /// </summary>
    [DefaultValue(true)]
    [Column("ignore_stale")]
    public bool IgnoreStale { get; set; } = true;

    /// <summary>
    /// Maximum age in seconds for an input value to be considered fresh.
    /// If (CurrentTime - InputItemTime) > StaleTimeout, the input is considered stale
    /// and ignored if IgnoreStale is enabled.
    /// Default: 60 seconds.
    /// </summary>
    [DefaultValue(60)]
    [Column("stale_timeout")]
    public long StaleTimeout { get; set; } = 60;

    /// <summary>
    /// Enables outlier detection to remove anomalous values before averaging.
    /// When enabled, uses OutlierMethod to identify and exclude outliers.
    /// Default: false.
    /// </summary>
    [DefaultValue(false)]
    [Column("enable_outlier_detection")]
    public bool EnableOutlierDetection { get; set; } = false;

    /// <summary>
    /// Outlier detection method to use when EnableOutlierDetection is true.
    /// - None: No outlier detection (use all valid inputs)
    /// - IQR: Interquartile Range method (robust, recommended) - removes values outside [Q1 - k*IQR, Q3 + k*IQR]
    /// - ZScore: Z-Score method (assumes normal distribution) - removes values with |z-score| > threshold
    /// Default: IQR.
    /// </summary>
    [DefaultValue(OutlierMethod.IQR)]
    [Column("outlier_method")]
    public OutlierMethod OutlierMethod { get; set; } = OutlierMethod.IQR;

    /// <summary>
    /// Threshold value for outlier detection.
    /// - For IQR method: Multiplier for IQR range. Default: 1.5 (standard boxplot rule)
    ///   Values outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR] are considered outliers.
    /// - For ZScore method: Z-score cutoff. Default: 3.0 (99.7% of normal distribution)
    ///   Values with |z-score| > 3.0 are considered outliers.
    /// </summary>
    [DefaultValue(1.5)]
    [Column("outlier_threshold")]
    public double OutlierThreshold { get; set; } = 1.5;

    /// <summary>
    /// Minimum number of valid (non-stale, non-outlier) inputs required to compute average.
    /// If fewer valid inputs are available, the output will not be updated.
    /// - Default: 1 (compute average even from single valid input)
    /// - Set higher to prevent output from insufficient data (e.g., 2 or 3)
    /// </summary>
    [DefaultValue(1)]
    [Column("minimum_inputs")]
    public int MinimumInputs { get; set; } = 1;

    // ==================== Moving Average / Filter Memory Properties ====================

    /// <summary>
    /// Type of moving average algorithm to use.
    /// - Simple (0): Equal weight to all samples - SMA
    /// - Exponential (1): Exponential decay weighting - EMA
    /// - Weighted (2): Linear or custom weights - WMA
    /// Default: Simple (0) for backward compatibility.
    /// </summary>
    [DefaultValue(MovingAverageType.Simple)]
    [Column("average_type")]
    public MovingAverageType AverageType { get; set; } = MovingAverageType.Simple;

    /// <summary>
    /// Number of samples to keep in the rolling window for moving average calculation.
    /// - Applies to SMA and WMA algorithms
    /// - Larger windows = more smoothing but slower response
    /// - Smaller windows = faster response but less smoothing
    /// Range: 2-1000, Default: 10 samples
    /// </summary>
    [DefaultValue(10)]
    [Column("window_size")]
    public int WindowSize { get; set; } = 10;

    /// <summary>
    /// Smoothing factor (alpha) for Exponential Moving Average (EMA).
    /// EMA = α × current_value + (1 - α) × previous_EMA
    /// - Higher alpha (closer to 1) = more weight on recent values, faster response
    /// - Lower alpha (closer to 0) = more weight on historical values, smoother output
    /// Range: 0.01-1.0, Default: 0.2
    /// Only used when AverageType = Exponential.
    /// </summary>
    [DefaultValue(0.2)]
    [Column("alpha")]
    public double Alpha { get; set; } = 0.2;

    /// <summary>
    /// If true, uses linear weights for WMA (most recent = highest weight).
    /// If false, uses custom weights from the Weights property.
    /// Linear weights: w[i] = i + 1, so for window_size=5: [1, 2, 3, 4, 5]
    /// Only used when AverageType = Weighted.
    /// Default: true
    /// </summary>
    [DefaultValue(true)]
    [Column("use_linear_weights")]
    public bool UseLinearWeights { get; set; } = true;
    
    /// <summary>
    /// Navigation property to sample history for moving average calculations.
    /// </summary>
    public virtual ICollection<AverageMemorySample> Samples { get; set; } = new List<AverageMemorySample>();
}
