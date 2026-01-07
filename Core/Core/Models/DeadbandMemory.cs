using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

/// <summary>
/// Deadband type for analog value filtering
/// </summary>
public enum DeadbandType
{
    /// <summary>
    /// Absolute deadband: output changes only when |current - lastOutput| > deadband
    /// </summary>
    Absolute = 0,
    
    /// <summary>
    /// Percentage deadband: output changes only when |current - lastOutput| > (deadband% × span)
    /// where span = Max - Min of the input range
    /// </summary>
    Percentage = 1,
    
    /// <summary>
    /// Rate of change deadband: output changes only when |current - lastInput| / elapsedSeconds > deadband
    /// Threshold is in units per second
    /// </summary>
    RateOfChange = 2
}

/// <summary>
/// Specifies the source type for deadband memory input or output
/// </summary>
public enum DeadbandSourceType
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
/// Deadband/Hysteresis Memory for reducing output chatter from noisy inputs
/// 
/// Use cases:
/// - Noise filtering on sensor values
/// - Prevent relay chatter on digital outputs
/// - Smooth control actions
/// - Reduce database writes
/// - Communication optimization
/// 
/// For analog inputs: Uses value-based deadband (Absolute/Percentage/RateOfChange)
/// For digital inputs: Uses time-based stability filtering (must remain stable for StabilityTime seconds)
/// 
/// Input and output sources can be either Points (MonitoringItems) or Global Variables.
/// </summary>
[Table("deadband_memory")]
public class DeadbandMemory
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    
    /// <summary>
    /// Optional human-readable name for the deadband memory
    /// </summary>
    [Column("name")]
    public string? Name { get; set; }

    /// <summary>
    /// Type of the input source: Point or GlobalVariable
    /// </summary>
    [Column("input_type")] 
    public DeadbandSourceType InputType { get; set; } = DeadbandSourceType.Point;
    
    /// <summary>
    /// Reference to the input source to monitor.
    /// - If InputType = Point: GUID string of the MonitoringItem (AnalogInput, AnalogOutput, DigitalInput, or DigitalOutput)
    /// - If InputType = GlobalVariable: Name of the Global Variable
    /// </summary>
    [Column("input_reference")] 
    public string InputReference { get; set; } = string.Empty;
    
    /// <summary>
    /// Type of the output source: Point or GlobalVariable
    /// </summary>
    [Column("output_type")] 
    public DeadbandSourceType OutputType { get; set; } = DeadbandSourceType.Point;
    
    /// <summary>
    /// Reference to the output source that receives the filtered value.
    /// - If OutputType = Point: GUID string of the MonitoringItem (AnalogOutput for analog, DigitalOutput for digital)
    /// - If OutputType = GlobalVariable: Name of the Global Variable (Boolean or Float type)
    /// </summary>
    [Column("output_reference")] 
    public string OutputReference { get; set; } = string.Empty;

    /// <summary>
    /// Processing interval in seconds
    /// </summary>
    [DefaultValue(1)]
    [Column("interval")]
    public int Interval { get; set; } = 1;

    /// <summary>
    /// Enable/disable flag for processing
    /// </summary>
    [DefaultValue(false)]
    [Column("is_disabled")]
    public bool IsDisabled { get; set; } = false;
    
    // ==================== Analog Deadband Settings ====================
    
    /// <summary>
    /// Deadband threshold value for analog inputs
    /// - Absolute: fixed value threshold (e.g., 0.5 means ±0.5 units)
    /// - Percentage: percentage of span (e.g., 1.0 means 1% of input range)
    /// - RateOfChange: rate threshold in units/second
    /// </summary>
    [DefaultValue(0.0)]
    [Column("deadband")]
    public double Deadband { get; set; } = 0.0;
    
    /// <summary>
    /// Type of deadband calculation for analog inputs
    /// </summary>
    [DefaultValue(DeadbandType.Absolute)]
    [Column("deadband_type")]
    public DeadbandType DeadbandType { get; set; } = DeadbandType.Absolute;
    
    /// <summary>
    /// Minimum value of input range (used for Percentage deadband calculation)
    /// </summary>
    [DefaultValue(0.0)]
    [Column("input_min")]
    public double InputMin { get; set; } = 0.0;
    
    /// <summary>
    /// Maximum value of input range (used for Percentage deadband calculation)
    /// </summary>
    [DefaultValue(100.0)]
    [Column("input_max")]
    public double InputMax { get; set; } = 100.0;
    
    // ==================== Digital Stability Settings ====================
    
    /// <summary>
    /// Stability time in seconds for digital inputs
    /// Digital input must remain stable for this duration before output changes
    /// </summary>
    [DefaultValue(1.0)]
    [Column("stability_time")]
    public double StabilityTime { get; set; } = 1.0;
    
    // ==================== State Fields ====================
    
    /// <summary>
    /// Last output value written (for deadband comparison)
    /// </summary>
    [Column("last_output_value")]
    public double? LastOutputValue { get; set; }
    
    /// <summary>
    /// Last input value read (for rate of change calculation)
    /// </summary>
    [Column("last_input_value")]
    public double? LastInputValue { get; set; }
    
    /// <summary>
    /// Timestamp when input last changed (for digital stability timing)
    /// Unix epoch seconds
    /// </summary>
    [Column("last_change_time")]
    public long? LastChangeTime { get; set; }
    
    /// <summary>
    /// Pending digital state waiting for stability confirmation
    /// </summary>
    [Column("pending_digital_state")]
    public bool? PendingDigitalState { get; set; }
    
    /// <summary>
    /// Timestamp of last processing (Unix epoch seconds)
    /// </summary>
    [Column("last_timestamp")]
    public long? LastTimestamp { get; set; }
    
    // ==================== Backward Compatibility Properties ====================
    
    /// <summary>
    /// [OBSOLETE] Use InputReference and InputType instead.
    /// For backward compatibility only. When InputType is Point, this returns InputReference as GUID.
    /// </summary>
    [Obsolete("Use InputReference and InputType instead")]
    [NotMapped]
    public Guid InputItemId
    {
        get => InputType == DeadbandSourceType.Point && Guid.TryParse(InputReference, out var guid) ? guid : Guid.Empty;
        set
        {
            InputType = DeadbandSourceType.Point;
            InputReference = value.ToString();
        }
    }
    
    /// <summary>
    /// [OBSOLETE] Use OutputReference and OutputType instead.
    /// For backward compatibility only. When OutputType is Point, this returns OutputReference as GUID.
    /// </summary>
    [Obsolete("Use OutputReference and OutputType instead")]
    [NotMapped]
    public Guid OutputItemId
    {
        get => OutputType == DeadbandSourceType.Point && Guid.TryParse(OutputReference, out var guid) ? guid : Guid.Empty;
        set
        {
            OutputType = DeadbandSourceType.Point;
            OutputReference = value.ToString();
        }
    }
}
