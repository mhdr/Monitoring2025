namespace API.Models.Dto;

/// <summary>
/// Response DTO containing list of PID memory configurations
/// </summary>
public class GetPIDMemoriesResponseDto
{
    /// <summary>
    /// List of PID memory configurations
    /// </summary>
    public List<PIDMemory> PIDMemories { get; set; } = [];

    /// <summary>
    /// Represents a PID memory configuration
    /// </summary>
    public class PIDMemory
    {
        /// <summary>
        /// Unique identifier of the PID memory
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Human-readable name for the PID controller
        /// </summary>
        public string? Name { get; set; }

        /// <summary>
        /// ID of the monitoring item for process variable (input)
        /// Must be AnalogInput
        /// </summary>
        public Guid InputItemId { get; set; }

        /// <summary>
        /// ID of the monitoring item for control output
        /// Must be AnalogOutput
        /// </summary>
        public Guid OutputItemId { get; set; }

        /// <summary>
        /// Proportional gain (Kp)
        /// </summary>
        public double Kp { get; set; }

        /// <summary>
        /// Integral gain (Ki)
        /// </summary>
        public double Ki { get; set; }

        /// <summary>
        /// Derivative gain (Kd)
        /// </summary>
        public double Kd { get; set; }

        /// <summary>
        /// Minimum output value
        /// </summary>
        public double OutputMin { get; set; }

        /// <summary>
        /// Maximum output value
        /// </summary>
        public double OutputMax { get; set; }

        /// <summary>
        /// Execution interval in seconds
        /// </summary>
        public int Interval { get; set; }

        /// <summary>
        /// Whether the PID controller is disabled
        /// </summary>
        public bool IsDisabled { get; set; }

        /// <summary>
        /// ID of monitoring item for dynamic setpoint (AnalogInput or AnalogOutput)
        /// </summary>
        public Guid SetPointId { get; set; }

        /// <summary>
        /// Derivative filter alpha (0-1)
        /// </summary>
        public double DerivativeFilterAlpha { get; set; }

        /// <summary>
        /// Maximum output slew rate
        /// </summary>
        public double MaxOutputSlewRate { get; set; }

        /// <summary>
        /// Dead zone around setpoint
        /// </summary>
        public double DeadZone { get; set; }

        /// <summary>
        /// Feed-forward term
        /// </summary>
        public double FeedForward { get; set; }

        /// <summary>
        /// ID of monitoring item for dynamic auto/manual mode (DigitalInput or DigitalOutput)
        /// </summary>
        public Guid IsAutoId { get; set; }

        /// <summary>
        /// ID of monitoring item for dynamic manual value (AnalogInput or AnalogOutput)
        /// </summary>
        public Guid ManualValueId { get; set; }

        /// <summary>
        /// ID of monitoring item for dynamic reverse output (DigitalInput or DigitalOutput)
        /// </summary>
        public Guid ReverseOutputId { get; set; }

        /// <summary>
        /// ID of digital output item for hysteresis control (optional)
        /// Must be DigitalOutput type. When configured, enables on/off control based on thresholds.
        /// </summary>
        public Guid? DigitalOutputItemId { get; set; }

        /// <summary>
        /// High threshold for hysteresis control (turn ON when output >= this value)
        /// </summary>
        public double HysteresisHighThreshold { get; set; }

        /// <summary>
        /// Low threshold for hysteresis control (turn OFF when output &lt;= this value)
        /// </summary>
        public double HysteresisLowThreshold { get; set; }
        
        /// <summary>
        /// Parent PID ID for cascaded control (optional)
        /// </summary>
        public Guid? ParentPIDId { get; set; }
        
        /// <summary>
        /// Cascade level: 0 = standalone/outer, 1 = outer in cascade, 2 = inner in cascade
        /// </summary>
        public int CascadeLevel { get; set; }
    }
}
