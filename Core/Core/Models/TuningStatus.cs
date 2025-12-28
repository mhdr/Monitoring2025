namespace Core.Models;

/// <summary>
/// Status of a PID auto-tuning session using Ziegler-Nichols relay feedback method
/// </summary>
public enum TuningStatus
{
    /// <summary>
    /// Tuning session has not started or is waiting to begin
    /// </summary>
    Idle = 0,
    
    /// <summary>
    /// Initializing tuning session and preparing relay test
    /// </summary>
    Initializing = 1,
    
    /// <summary>
    /// Actively performing relay test and collecting oscillation data
    /// </summary>
    RelayTest = 2,
    
    /// <summary>
    /// Relay test complete, analyzing oscillation data to calculate gains
    /// </summary>
    AnalyzingData = 3,
    
    /// <summary>
    /// Tuning successfully completed with calculated gains available
    /// </summary>
    Completed = 4,
    
    /// <summary>
    /// Tuning manually aborted by user or API call
    /// </summary>
    Aborted = 5,
    
    /// <summary>
    /// Tuning failed due to error (timeout, communication failure, insufficient oscillation)
    /// </summary>
    Failed = 6
}
