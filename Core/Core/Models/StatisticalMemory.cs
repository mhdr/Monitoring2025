using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

/// <summary>
/// Window type for statistical calculations
/// </summary>
public enum StatisticalWindowType
{
    /// <summary>
    /// Rolling/sliding window: continuously slides, always maintains WindowSize samples
    /// New sample pushes out the oldest sample
    /// </summary>
    Rolling = 1,
    
    /// <summary>
    /// Tumbling/batch window: collects WindowSize samples, calculates, then resets
    /// Stats are calculated only when window is full, then cleared for next batch
    /// </summary>
    Tumbling = 2
}

/// <summary>
/// Specifies the source type for statistical memory input
/// </summary>
public enum StatisticalSourceType
{
    /// <summary>
    /// Reference is a Point (MonitoringItem) GUID
    /// </summary>
    Point = 0,
    
    /// <summary>
    /// Reference is a Global Variable name
    /// </summary>
    GlobalVariable = 1
}

/// <summary>
/// Statistical Memory for computing statistical metrics (min, max, avg, stddev, range, median, percentiles, CV)
/// over a configurable rolling or tumbling time window. Supports multiple optional outputs and custom percentiles.
/// </summary>
/// <remarks>
/// Use Cases:
/// - Peak demand tracking (max values over hourly/daily windows)
/// - Process variability monitoring (standard deviation, coefficient of variation)
/// - Quality control and 6-sigma analysis (percentiles, outlier detection)
/// - Baseline establishment (average, median over extended periods)
/// - Performance reporting (comprehensive statistics for dashboards)
/// - SLA monitoring (P95, P99 response times)
/// 
/// Features:
/// - Configurable window size (number of samples)
/// - Rolling (sliding) or Tumbling (batch reset) window modes
/// - Optional outputs: only calculate and write enabled metrics
/// - Custom percentile configuration with flexible percentile values
/// - Database-backed sample storage with automatic cleanup
/// - Coefficient of Variation for normalized variability comparison
/// </remarks>
[Table("statistical_memory")]
public class StatisticalMemory
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    /// <summary>
    /// Optional name/description for this statistical memory configuration.
    /// </summary>
    [Column("name")]
    public string? Name { get; set; }

    /// <summary>
    /// Type of the input source: Point or GlobalVariable
    /// </summary>
    [Column("input_type")] 
    public StatisticalSourceType InputType { get; set; } = StatisticalSourceType.Point;

    /// <summary>
    /// Reference to the input source for statistical calculations.
    /// - If InputType = Point: GUID string of the MonitoringItem
    /// - If InputType = GlobalVariable: Name of the Global Variable
    /// </summary>
    [Column("input_reference")] 
    public string InputReference { get; set; } = string.Empty;

    /// <summary>
    /// [DEPRECATED - Use InputReference instead] The analog input item to collect samples from.
    /// Must be AnalogInput or AnalogOutput type.
    /// Kept for backward compatibility.
    /// </summary>
    [Column("input_item_id")]
    public Guid InputItemId { get; set; }

    /// <summary>
    /// Processing interval in seconds. Samples are collected at this frequency.
    /// Default: 10 seconds.
    /// </summary>
    [DefaultValue(10)]
    [Column("interval")]
    public int Interval { get; set; } = 10;

    /// <summary>
    /// If true, this statistical memory is disabled and will not be processed.
    /// </summary>
    [DefaultValue(false)]
    [Column("is_disabled")]
    public bool IsDisabled { get; set; } = false;

    /// <summary>
    /// Write duration in seconds for controller writes.
    /// Default: 10 seconds. Must be >= 0.
    /// 0 means instant write-and-release for supported interfaces.
    /// </summary>
    [Column("duration")]
    [DefaultValue(10)]
    [Required]
    public long Duration { get; set; } = 10;

    #region Window Configuration

    /// <summary>
    /// Number of samples to include in statistical calculations.
    /// Range: 10 to 10000 samples.
    /// Default: 100 samples.
    /// </summary>
    [DefaultValue(100)]
    [Column("window_size")]
    public int WindowSize { get; set; } = 100;

    /// <summary>
    /// Type of window for statistical calculations.
    /// - Rolling: Sliding window that always maintains WindowSize samples
    /// - Tumbling: Batch window that resets after WindowSize samples are collected
    /// Default: Rolling
    /// </summary>
    [DefaultValue(StatisticalWindowType.Rolling)]
    [Column("window_type")]
    public StatisticalWindowType WindowType { get; set; } = StatisticalWindowType.Rolling;

    /// <summary>
    /// Minimum number of samples required before calculating statistics.
    /// Statistics will output null/0 until this threshold is reached.
    /// Default: 2 (minimum for standard deviation calculation).
    /// </summary>
    [DefaultValue(2)]
    [Column("min_samples")]
    public int MinSamples { get; set; } = 2;

    #endregion

    #region Optional Output Items (all nullable for optional selection)

    /// <summary>
    /// Optional output item for minimum value.
    /// Must be AnalogOutput type if specified.
    /// </summary>
    [Column("output_min_item_id")]
    public Guid? OutputMinItemId { get; set; }

    /// <summary>
    /// Optional output item for maximum value.
    /// Must be AnalogOutput type if specified.
    /// </summary>
    [Column("output_max_item_id")]
    public Guid? OutputMaxItemId { get; set; }

    /// <summary>
    /// Optional output item for average (mean) value.
    /// Must be AnalogOutput type if specified.
    /// </summary>
    [Column("output_avg_item_id")]
    public Guid? OutputAvgItemId { get; set; }

    /// <summary>
    /// Optional output item for standard deviation.
    /// Uses sample standard deviation (N-1 denominator).
    /// Must be AnalogOutput type if specified.
    /// </summary>
    [Column("output_stddev_item_id")]
    public Guid? OutputStdDevItemId { get; set; }

    /// <summary>
    /// Optional output item for range (max - min).
    /// Must be AnalogOutput type if specified.
    /// </summary>
    [Column("output_range_item_id")]
    public Guid? OutputRangeItemId { get; set; }

    /// <summary>
    /// Optional output item for median (50th percentile).
    /// Must be AnalogOutput type if specified.
    /// </summary>
    [Column("output_median_item_id")]
    public Guid? OutputMedianItemId { get; set; }

    /// <summary>
    /// Optional output item for Coefficient of Variation (CV = stddev/avg * 100).
    /// Useful for comparing variability across different scales.
    /// Must be AnalogOutput type if specified.
    /// </summary>
    [Column("output_cv_item_id")]
    public Guid? OutputCVItemId { get; set; }

    #endregion

    #region Percentile Configuration

    /// <summary>
    /// JSON array of custom percentile configurations.
    /// Format: [{"percentile": 95, "outputItemId": "guid"}, {"percentile": 99, "outputItemId": "guid"}]
    /// Percentile values must be between 0 and 100.
    /// Each output item must be AnalogOutput type.
    /// </summary>
    [Column("percentiles_config")]
    public string PercentilesConfig { get; set; } = "[]";

    #endregion

    #region State Tracking

    /// <summary>
    /// For Tumbling window: Number of samples collected in current batch.
    /// Reset to 0 when batch is processed and cleared.
    /// </summary>
    [DefaultValue(0)]
    [Column("current_batch_count")]
    public int CurrentBatchCount { get; set; } = 0;

    /// <summary>
    /// Timestamp of last batch reset (for Tumbling window mode).
    /// Unix epoch seconds.
    /// </summary>
    [Column("last_reset_time")]
    public long? LastResetTime { get; set; }

    #endregion

    /// <summary>
    /// Navigation property to sample history
    /// </summary>
    public virtual ICollection<StatisticalMemorySample>? Samples { get; set; }
}

/// <summary>
/// Represents a single percentile output configuration
/// </summary>
public class PercentileConfig
{
    /// <summary>
    /// Percentile value (0-100). Common values: 50 (median), 90, 95, 99
    /// </summary>
    public double Percentile { get; set; }
    
    /// <summary>
    /// Output item ID to write the calculated percentile value
    /// </summary>
    public Guid OutputItemId { get; set; }
}
