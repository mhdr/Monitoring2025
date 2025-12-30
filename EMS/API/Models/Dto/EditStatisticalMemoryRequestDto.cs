using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for editing an existing statistical memory configuration
/// </summary>
public class EditStatisticalMemoryRequestDto
{
    /// <summary>
    /// ID of the statistical memory to edit
    /// </summary>
    [Required(ErrorMessage = "ID is required")]
    public Guid Id { get; set; }

    /// <summary>
    /// Human-readable name for the statistical memory
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// ID of the input monitoring item to collect samples from
    /// Must be AnalogInput or AnalogOutput type
    /// </summary>
    [Required(ErrorMessage = "Input item ID is required")]
    public Guid InputItemId { get; set; }

    /// <summary>
    /// Execution interval in seconds (must be greater than 0)
    /// </summary>
    [Required(ErrorMessage = "Interval is required")]
    [Range(1, int.MaxValue, ErrorMessage = "Interval must be greater than 0")]
    public int Interval { get; set; } = 10;

    /// <summary>
    /// Whether the statistical memory is disabled
    /// </summary>
    public bool IsDisabled { get; set; } = false;

    #region Window Configuration

    /// <summary>
    /// Number of samples in the calculation window (10-10000)
    /// </summary>
    [Required(ErrorMessage = "Window size is required")]
    [Range(10, 10000, ErrorMessage = "Window size must be between 10 and 10000")]
    public int WindowSize { get; set; } = 100;

    /// <summary>
    /// Window type: 1 = Rolling (sliding window), 2 = Tumbling (batch reset)
    /// </summary>
    [Required(ErrorMessage = "Window type is required")]
    [Range(1, 2, ErrorMessage = "Window type must be 1 (Rolling) or 2 (Tumbling)")]
    public int WindowType { get; set; } = 1;

    /// <summary>
    /// Minimum samples required before calculating statistics (2-WindowSize)
    /// </summary>
    [Range(2, 10000, ErrorMessage = "Min samples must be at least 2")]
    public int MinSamples { get; set; } = 2;

    #endregion

    #region Optional Output Items (at least one required)

    /// <summary>
    /// Optional output item for minimum value (must be AnalogOutput)
    /// </summary>
    public Guid? OutputMinItemId { get; set; }

    /// <summary>
    /// Optional output item for maximum value (must be AnalogOutput)
    /// </summary>
    public Guid? OutputMaxItemId { get; set; }

    /// <summary>
    /// Optional output item for average/mean value (must be AnalogOutput)
    /// </summary>
    public Guid? OutputAvgItemId { get; set; }

    /// <summary>
    /// Optional output item for standard deviation (must be AnalogOutput)
    /// </summary>
    public Guid? OutputStdDevItemId { get; set; }

    /// <summary>
    /// Optional output item for range (max - min) (must be AnalogOutput)
    /// </summary>
    public Guid? OutputRangeItemId { get; set; }

    /// <summary>
    /// Optional output item for median (50th percentile) (must be AnalogOutput)
    /// </summary>
    public Guid? OutputMedianItemId { get; set; }

    /// <summary>
    /// Optional output item for Coefficient of Variation (CV = stddev/avg * 100) (must be AnalogOutput)
    /// </summary>
    public Guid? OutputCVItemId { get; set; }

    #endregion

    #region Percentile Configuration

    /// <summary>
    /// JSON array of custom percentile configurations
    /// Format: [{"percentile": 95, "outputItemId": "guid"}, {"percentile": 99, "outputItemId": "guid"}]
    /// </summary>
    public string PercentilesConfig { get; set; } = "[]";

    #endregion

    #region State Tracking (usually not edited directly)

    /// <summary>
    /// Current batch count for tumbling window
    /// </summary>
    public int CurrentBatchCount { get; set; } = 0;

    /// <summary>
    /// Timestamp of last batch reset
    /// </summary>
    public long? LastResetTime { get; set; }

    #endregion
}
