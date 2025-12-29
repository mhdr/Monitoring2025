using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Core.Libs;

namespace Core.Models;

/// <summary>
/// Represents an average memory configuration that computes the mean of multiple analog input items
/// with optional outlier detection and weighted averaging.
/// </summary>
/// <remarks>
/// The AverageMemoryProcess performs the following operations:
/// 1. Retrieves values from all specified input items
/// 2. Filters out stale values (optional, based on IgnoreStale and StaleTimeout)
/// 3. Detects and removes outliers (optional, using IQR or Z-Score method)
/// 4. Computes weighted or simple average of remaining values
/// 5. Writes the result to the output item
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
}
