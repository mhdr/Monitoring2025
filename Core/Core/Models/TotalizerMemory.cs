using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

/// <summary>
/// Specifies the source type for totalizer memory input or output
/// </summary>
public enum TotalizerSourceType
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
/// Accumulation types for totalizer memory
/// </summary>
public enum AccumulationType
{
    /// <summary>
    /// Integrate analog rate values over time using trapezoidal rule (e.g., flow rate → total volume)
    /// </summary>
    RateIntegration = 1,
    
    /// <summary>
    /// Count rising edge events (low to high transitions)
    /// </summary>
    EventCountRising = 2,
    
    /// <summary>
    /// Count falling edge events (high to low transitions)
    /// </summary>
    EventCountFalling = 3,
    
    /// <summary>
    /// Count both rising and falling edge events
    /// </summary>
    EventCountBoth = 4
}

/// <summary>
/// Totalizer/Accumulator Memory for accumulating flow, energy, event counts, and operating hours over time
/// </summary>
[Table("totalizer_memory")]
public class TotalizerMemory
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    
    /// <summary>
    /// Optional human-readable name for the totalizer
    /// </summary>
    [Column("name")]
    public string? Name { get; set; }

    /// <summary>
    /// Type of the input source: Point or GlobalVariable
    /// </summary>
    [Column("input_type")] 
    public TotalizerSourceType InputType { get; set; } = TotalizerSourceType.Point;
    
    /// <summary>
    /// Reference to the input source (AnalogInput for rate integration, DigitalInput for event counting).
    /// - If InputType = Point: GUID string of the MonitoringItem
    /// - If InputType = GlobalVariable: Name of the Global Variable
    /// </summary>
    [Column("input_reference")] 
    public string InputReference { get; set; } = string.Empty;
    
    /// <summary>
    /// Type of the output source: Point or GlobalVariable
    /// </summary>
    [Column("output_type")] 
    public TotalizerSourceType OutputType { get; set; } = TotalizerSourceType.Point;
    
    /// <summary>
    /// Reference to the output source where accumulated value is written.
    /// - If OutputType = Point: GUID string of the MonitoringItem (must be AnalogOutput)
    /// - If OutputType = GlobalVariable: Name of the Global Variable
    /// </summary>
    [Column("output_reference")] 
    public string OutputReference { get; set; } = string.Empty;

    /// <summary>
    /// Processing interval in seconds
    /// </summary>
    [DefaultValue(10)]
    [Column("interval")]
    public int Interval { get; set; }

    /// <summary>
    /// Enable/disable flag for processing
    /// </summary>
    [DefaultValue(false)]
    [Column("is_disabled")]
    public bool IsDisabled { get; set; }
    
    /// <summary>
    /// Type of accumulation to perform
    /// </summary>
    [DefaultValue(AccumulationType.RateIntegration)]
    [Column("accumulation_type")]
    public AccumulationType AccumulationType { get; set; }
    
    /// <summary>
    /// Enable automatic reset when overflow threshold is reached
    /// </summary>
    [DefaultValue(false)]
    [Column("reset_on_overflow")]
    public bool ResetOnOverflow { get; set; }
    
    /// <summary>
    /// Overflow threshold value (null = no overflow limit)
    /// </summary>
    [Column("overflow_threshold")]
    public double? OverflowThreshold { get; set; }
    
    /// <summary>
    /// Enable manual reset via API endpoint
    /// </summary>
    [DefaultValue(true)]
    [Column("manual_reset_enabled")]
    public bool ManualResetEnabled { get; set; }
    
    /// <summary>
    /// Enable scheduled reset based on cron expression
    /// </summary>
    [DefaultValue(false)]
    [Column("scheduled_reset_enabled")]
    public bool ScheduledResetEnabled { get; set; }
    
    /// <summary>
    /// Cron expression for scheduled reset (e.g., "0 0 * * *" for daily at midnight)
    /// </summary>
    [Column("reset_cron")]
    public string? ResetCron { get; set; }
    
    /// <summary>
    /// Timestamp of last reset (auto, manual, or scheduled)
    /// </summary>
    [Column("last_reset_time")]
    public DateTime? LastResetTime { get; set; }
    
    /// <summary>
    /// Accumulated value persisted for crash recovery
    /// </summary>
    [DefaultValue(0.0)]
    [Column("accumulated_value")]
    public double AccumulatedValue { get; set; }
    
    /// <summary>
    /// Last input value for trapezoidal rule calculation (null on first run)
    /// </summary>
    [Column("last_input_value")]
    public double? LastInputValue { get; set; }
    
    /// <summary>
    /// Last event state for edge detection (null = baseline not established)
    /// </summary>
    [Column("last_event_state")]
    public bool? LastEventState { get; set; }
    
    /// <summary>
    /// Optional display units (e.g., "kWh", "m³", "hours", "count")
    /// </summary>
    [Column("units")]
    public string? Units { get; set; }
    
    /// <summary>
    /// Number of decimal places for formatting (default 2)
    /// </summary>
    [DefaultValue(2)]
    [Column("decimal_places")]
    public int DecimalPlaces { get; set; }
}
