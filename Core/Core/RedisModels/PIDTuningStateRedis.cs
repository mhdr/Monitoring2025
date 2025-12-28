using Core.Models;

namespace Core.RedisModels;

/// <summary>
/// Redis model for storing real-time state of a PID auto-tuning session.
/// Tracks relay operation, peak/trough detection, and oscillation cycle data.
/// Key pattern: PIDTuningState:{pidMemoryId}
/// </summary>
public class PIDTuningStateRedis
{
    /// <summary>
    /// PID Memory ID being tuned
    /// </summary>
    public Guid PIDMemoryId { get; set; }
    
    /// <summary>
    /// Reference to the database tuning session record
    /// </summary>
    public Guid SessionId { get; set; }
    
    /// <summary>
    /// Current tuning status
    /// </summary>
    public TuningStatus Status { get; set; }
    
    /// <summary>
    /// Session start time (Unix epoch seconds)
    /// </summary>
    public long SessionStartTime { get; set; }
    
    // ===== RELAY STATE =====
    
    /// <summary>
    /// Current relay state (true = high output, false = low output)
    /// </summary>
    public bool RelayHigh { get; set; }
    
    /// <summary>
    /// High relay output value (OutputMin + range * amplitude)
    /// </summary>
    public double RelayOutputHigh { get; set; }
    
    /// <summary>
    /// Low relay output value (OutputMin)
    /// </summary>
    public double RelayOutputLow { get; set; }
    
    /// <summary>
    /// Target setpoint for oscillation detection
    /// </summary>
    public double SetPoint { get; set; }
    
    /// <summary>
    /// Hysteresis deadband around setpoint
    /// </summary>
    public double Hysteresis { get; set; }
    
    // ===== OSCILLATION TRACKING =====
    
    /// <summary>
    /// Detected peak values during oscillation (process variable maxima)
    /// </summary>
    public List<double> PeakValues { get; set; } = new();
    
    /// <summary>
    /// Timestamps of detected peaks (Unix epoch seconds)
    /// </summary>
    public List<long> PeakTimes { get; set; } = new();
    
    /// <summary>
    /// Detected trough values during oscillation (process variable minima)
    /// </summary>
    public List<double> TroughValues { get; set; } = new();
    
    /// <summary>
    /// Timestamps of detected troughs (Unix epoch seconds)
    /// </summary>
    public List<long> TroughTimes { get; set; } = new();
    
    // ===== CURRENT CYCLE STATE =====
    
    /// <summary>
    /// Last setpoint crossing value (for detecting peaks/troughs)
    /// </summary>
    public double? LastCrossingValue { get; set; }
    
    /// <summary>
    /// Last setpoint crossing timestamp (Unix epoch seconds)
    /// </summary>
    public long? LastCrossingTime { get; set; }
    
    /// <summary>
    /// Number of complete oscillation cycles detected
    /// </summary>
    public int CycleCount { get; set; }
    
    /// <summary>
    /// Previous process variable value (for peak/trough detection)
    /// </summary>
    public double? PreviousProcessVariable { get; set; }
    
    /// <summary>
    /// Two values back (for robust peak/trough detection: prev2 < prev1 < current = peak)
    /// </summary>
    public double? PreviousProcessVariable2 { get; set; }
    
    /// <summary>
    /// Direction indicator: true = ascending towards peak, false = descending towards trough
    /// </summary>
    public bool? IsAscending { get; set; }
    
    // ===== SAFETY & MONITORING =====
    
    /// <summary>
    /// Last update timestamp (Unix epoch seconds)
    /// </summary>
    public long LastUpdateTime { get; set; }
    
    /// <summary>
    /// Count of consecutive processing failures (reset on success, abort on threshold)
    /// </summary>
    public int ConsecutiveFailures { get; set; }
    
    /// <summary>
    /// Maximum amplitude observed during tuning (for safety checks)
    /// </summary>
    public double MaxAmplitudeObserved { get; set; }
}
