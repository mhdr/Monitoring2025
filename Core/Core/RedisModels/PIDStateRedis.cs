namespace Core.RedisModels;

/// <summary>
/// Redis model for persisting PID controller state to prevent control spikes on service restart.
/// Stores integral term, derivative history, and previous output for bumpless restart.
/// </summary>
public class PIDStateRedis
{
    /// <summary>
    /// PID Memory ID
    /// </summary>
    public Guid PIDMemoryId { get; set; }
    
    /// <summary>
    /// Accumulated integral term
    /// </summary>
    public double IntegralTerm { get; set; }
    
    /// <summary>
    /// Previous process variable value used for derivative calculation
    /// </summary>
    public double PreviousProcessVariable { get; set; }
    
    /// <summary>
    /// Current filtered derivative value
    /// </summary>
    public double FilteredDerivative { get; set; }
    
    /// <summary>
    /// Previous controller output value used for slew rate limiting
    /// </summary>
    public double PreviousOutput { get; set; }
    
    /// <summary>
    /// Digital output state for hysteresis control
    /// </summary>
    public bool DigitalOutputState { get; set; }
    
    /// <summary>
    /// Last update timestamp (Unix epoch seconds)
    /// </summary>
    public long LastUpdateTime { get; set; }
    
    /// <summary>
    /// PID configuration hash to detect changes that require state reset
    /// </summary>
    public string ConfigurationHash { get; set; } = string.Empty;
    
    /// <summary>
    /// Parent PID ID for cascaded control (optional, for tracking)
    /// </summary>
    public Guid? ParentPIDId { get; set; }
    
    /// <summary>
    /// Cascade level: 0 = standalone/outer, 1 = outer in cascade, 2 = inner in cascade
    /// </summary>
    public int CascadeLevel { get; set; }
}
