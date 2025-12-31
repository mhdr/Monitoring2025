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
    /// Input monitoring item ID (can be AnalogInput, AnalogOutput, DigitalInput, or DigitalOutput)
    /// </summary>
    [Column("input_item_id")]
    public Guid InputItemId { get; set; }
    
    /// <summary>
    /// Output monitoring item ID where filtered value is written
    /// For analog inputs: must be AnalogOutput
    /// For digital inputs: must be DigitalOutput
    /// </summary>
    [Column("output_item_id")]
    public Guid OutputItemId { get; set; }

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
}
