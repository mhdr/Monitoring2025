using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

/// <summary>
/// Represents a PID auto-tuning session using Ziegler-Nichols relay feedback method.
/// Stores configuration, measured oscillation data, calculated gains, and quality metrics.
/// </summary>
[Table("pid_tuning_session")]
public class PIDTuningSession
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    
    /// <summary>
    /// Reference to the PID controller being tuned
    /// </summary>
    [Column("pid_memory_id")]
    public Guid PIDMemoryId { get; set; }
    
    // ===== SESSION METADATA =====
    
    [Column("start_time")]
    public DateTime StartTime { get; set; }
    
    [Column("end_time")]
    public DateTime? EndTime { get; set; }
    
    [Column("status")]
    public TuningStatus Status { get; set; }
    
    [Column("error_message")]
    public string? ErrorMessage { get; set; }
    
    // ===== RELAY CONFIGURATION =====
    
    /// <summary>
    /// Output swing amplitude for relay test as percentage of output range (typically 10-50%)
    /// </summary>
    [DefaultValue(20.0)]
    [Column("relay_amplitude")]
    public double RelayAmplitude { get; set; }
    
    /// <summary>
    /// Deadband around setpoint to prevent chattering (in engineering units)
    /// </summary>
    [DefaultValue(0.5)]
    [Column("relay_hysteresis")]
    public double RelayHysteresis { get; set; }
    
    // ===== OSCILLATION DETECTION SETTINGS =====
    
    /// <summary>
    /// Minimum number of consistent oscillation cycles required before analysis (default: 3)
    /// </summary>
    [DefaultValue(3)]
    [Column("min_cycles")]
    public int MinCycles { get; set; }
    
    /// <summary>
    /// Maximum cycles to collect before aborting tuning (default: 10)
    /// </summary>
    [DefaultValue(10)]
    [Column("max_cycles")]
    public int MaxCycles { get; set; }
    
    /// <summary>
    /// Safety limit: maximum oscillation amplitude as percentage of process variable scale (default: 10%)
    /// </summary>
    [DefaultValue(10.0)]
    [Column("max_amplitude")]
    public double MaxAmplitude { get; set; }
    
    /// <summary>
    /// Maximum tuning session duration in seconds (default: 600 = 10 minutes)
    /// </summary>
    [DefaultValue(600)]
    [Column("timeout")]
    public int Timeout { get; set; }
    
    // ===== MEASURED RESULTS (from oscillation analysis) =====
    
    /// <summary>
    /// Ultimate period (Pu) - average time for one complete oscillation cycle in seconds
    /// </summary>
    [Column("ultimate_period")]
    public double? UltimatePeriod { get; set; }
    
    /// <summary>
    /// Oscillation amplitude (a) - average peak-to-peak magnitude in engineering units
    /// </summary>
    [Column("oscillation_amplitude")]
    public double? OscillationAmplitude { get; set; }
    
    /// <summary>
    /// Critical gain (Ku) calculated from relay amplitude and oscillation amplitude: Ku = 4d / (πa)
    /// </summary>
    [Column("critical_gain")]
    public double? CriticalGain { get; set; }
    
    // ===== CALCULATED PID GAINS (Ziegler-Nichols formulas) =====
    
    /// <summary>
    /// Calculated proportional gain: Kp = 0.6 × Ku
    /// </summary>
    [Column("calculated_kp")]
    public double? CalculatedKp { get; set; }
    
    /// <summary>
    /// Calculated integral gain: Ki = 1.2 × Ku / Pu
    /// </summary>
    [Column("calculated_ki")]
    public double? CalculatedKi { get; set; }
    
    /// <summary>
    /// Calculated derivative gain: Kd = 0.075 × Ku × Pu
    /// </summary>
    [Column("calculated_kd")]
    public double? CalculatedKd { get; set; }
    
    // ===== ORIGINAL GAINS (for rollback) =====
    
    [Column("original_kp")]
    public double OriginalKp { get; set; }
    
    [Column("original_ki")]
    public double OriginalKi { get; set; }
    
    [Column("original_kd")]
    public double OriginalKd { get; set; }
    
    // ===== QUALITY METRICS =====
    
    /// <summary>
    /// Confidence score (0-1) based on cycle-to-cycle consistency.
    /// Higher values indicate more reliable tuning results.
    /// Typical threshold: 0.8 for automatic application, below requires manual review.
    /// </summary>
    [Column("confidence_score")]
    public double? ConfidenceScore { get; set; }
    
    /// <summary>
    /// Optional notes or observations about the tuning session
    /// </summary>
    [Column("notes")]
    public string? Notes { get; set; }
}
