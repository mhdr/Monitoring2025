using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for editing an existing average memory / moving average configuration
/// </summary>
public class EditAverageMemoryRequestDto
{
    /// <summary>
    /// ID of the average memory to edit
    /// </summary>
    [Required(ErrorMessage = "ID is required")]
    public Guid Id { get; set; }

    /// <summary>
    /// Human-readable name for the average memory
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// JSON array of input item IDs to average
    /// Format: ["guid1", "guid2", ...]
    /// </summary>
    [Required(ErrorMessage = "Input item IDs are required")]
    public string InputItemIds { get; set; } = "[]";

    /// <summary>
    /// ID of the output monitoring item for averaged value
    /// </summary>
    [Required(ErrorMessage = "Output item ID is required")]
    public Guid OutputItemId { get; set; }

    /// <summary>
    /// Execution interval in seconds (must be greater than 0)
    /// </summary>
    [Required(ErrorMessage = "Interval is required")]
    [Range(1, int.MaxValue, ErrorMessage = "Interval must be greater than 0")]
    public int Interval { get; set; } = 10;

    /// <summary>
    /// Whether the average memory is disabled
    /// </summary>
    public bool IsDisabled { get; set; } = false;

    /// <summary>
    /// Optional JSON array of weights for weighted average
    /// </summary>
    public string? Weights { get; set; }

    /// <summary>
    /// Whether to ignore stale (outdated) inputs
    /// </summary>
    public bool IgnoreStale { get; set; } = true;

    /// <summary>
    /// Stale timeout in seconds
    /// </summary>
    [Range(1, long.MaxValue, ErrorMessage = "Stale timeout must be greater than 0")]
    public long StaleTimeout { get; set; } = 60;

    /// <summary>
    /// Whether to enable outlier detection
    /// </summary>
    public bool EnableOutlierDetection { get; set; } = false;

    /// <summary>
    /// Outlier detection method (0=None, 1=IQR, 2=ZScore)
    /// </summary>
    [Range(0, 2, ErrorMessage = "Outlier method must be 0-2")]
    public int OutlierMethod { get; set; } = 1;

    /// <summary>
    /// Outlier threshold value
    /// </summary>
    [Range(0.01, 100, ErrorMessage = "Outlier threshold must be positive")]
    public double OutlierThreshold { get; set; } = 1.5;

    /// <summary>
    /// Minimum number of valid inputs required
    /// </summary>
    [Range(1, int.MaxValue, ErrorMessage = "Minimum inputs must be at least 1")]
    public int MinimumInputs { get; set; } = 1;

    // ==================== Moving Average / Filter Memory Properties ====================

    /// <summary>
    /// Type of moving average algorithm (0=Simple, 1=Exponential, 2=Weighted)
    /// </summary>
    [Range(0, 2, ErrorMessage = "Average type must be 0-2")]
    public int AverageType { get; set; } = 0;

    /// <summary>
    /// Window size for SMA/WMA (number of samples)
    /// </summary>
    [Range(2, 1000, ErrorMessage = "Window size must be between 2 and 1000")]
    public int WindowSize { get; set; } = 10;

    /// <summary>
    /// Alpha (smoothing factor) for EMA (0.01-1.0)
    /// </summary>
    [Range(0.01, 1.0, ErrorMessage = "Alpha must be between 0.01 and 1.0")]
    public double Alpha { get; set; } = 0.2;

    /// <summary>
    /// Use linear weights for WMA (true) or custom weights (false)
    /// </summary>
    public bool UseLinearWeights { get; set; } = true;
}
