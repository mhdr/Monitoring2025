using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for editing an existing totalizer memory configuration
/// </summary>
public class EditTotalizerMemoryRequestDto
{
    /// <summary>
    /// ID of the totalizer memory to edit
    /// </summary>
    [Required(ErrorMessage = "ID is required")]
    public Guid Id { get; set; }

    /// <summary>
    /// Human-readable name for the totalizer
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// ID of the input monitoring item
    /// Must be AnalogInput for rate integration, DigitalInput for event counting
    /// </summary>
    [Required(ErrorMessage = "Input item ID is required")]
    public Guid InputItemId { get; set; }

    /// <summary>
    /// ID of the output monitoring item for accumulated value
    /// Must be AnalogOutput
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
    /// Whether the totalizer is disabled
    /// </summary>
    public bool IsDisabled { get; set; } = false;

    /// <summary>
    /// Type of accumulation (1=RateIntegration, 2=EventCountRising, 3=EventCountFalling, 4=EventCountBoth)
    /// </summary>
    [Required(ErrorMessage = "Accumulation type is required")]
    [Range(1, 4, ErrorMessage = "Accumulation type must be 1-4")]
    public int AccumulationType { get; set; } = 1;

    /// <summary>
    /// Enable automatic reset when overflow threshold is reached
    /// </summary>
    public bool ResetOnOverflow { get; set; } = false;

    /// <summary>
    /// Overflow threshold value (must be positive if reset on overflow is enabled)
    /// </summary>
    [Range(0.0, double.MaxValue, ErrorMessage = "Overflow threshold must be positive")]
    public double? OverflowThreshold { get; set; }

    /// <summary>
    /// Enable manual reset via API endpoint
    /// </summary>
    public bool ManualResetEnabled { get; set; } = true;

    /// <summary>
    /// Enable scheduled reset based on cron expression
    /// </summary>
    public bool ScheduledResetEnabled { get; set; } = false;

    /// <summary>
    /// Cron expression for scheduled reset (e.g., "0 0 * * *" for daily at midnight)
    /// </summary>
    public string? ResetCron { get; set; }

    /// <summary>
    /// Accumulated value (persisted for crash recovery)
    /// </summary>
    public double AccumulatedValue { get; set; } = 0.0;

    /// <summary>
    /// Last input value for trapezoidal rule
    /// </summary>
    public double? LastInputValue { get; set; }

    /// <summary>
    /// Last event state for edge detection
    /// </summary>
    public bool? LastEventState { get; set; }

    /// <summary>
    /// Timestamp of last reset
    /// </summary>
    public DateTime? LastResetTime { get; set; }

    /// <summary>
    /// Optional display units (e.g., "kWh", "m³", "hours", "count")
    /// </summary>
    public string? Units { get; set; }

    /// <summary>
    /// Number of decimal places for formatting (0-10)
    /// </summary>
    [Range(0, 10, ErrorMessage = "Decimal places must be between 0 and 10")]
    public int DecimalPlaces { get; set; } = 2;
}
