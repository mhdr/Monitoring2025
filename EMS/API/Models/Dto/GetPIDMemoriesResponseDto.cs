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
        /// Type of the input source: 0=Point, 1=GlobalVariable
        /// </summary>
        public int InputType { get; set; }

        /// <summary>
        /// Reference to the input source (GUID string for Point, name for GlobalVariable)
        /// Must be AnalogInput when InputType=Point
        /// </summary>
        public string InputReference { get; set; } = string.Empty;

        /// <summary>
        /// Type of the output source: 0=Point, 1=GlobalVariable
        /// </summary>
        public int OutputType { get; set; }

        /// <summary>
        /// Reference to the output source (GUID string for Point, name for GlobalVariable)
        /// Must be AnalogOutput when OutputType=Point
        /// </summary>
        public string OutputReference { get; set; } = string.Empty;

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
        /// Type of the setpoint source: 0=Point, 1=GlobalVariable
        /// </summary>
        public int SetPointType { get; set; }

        /// <summary>
        /// Reference to the setpoint source (GUID string for Point, name for GlobalVariable)
        /// Must be AnalogInput or AnalogOutput when SetPointType=Point
        /// </summary>
        public string SetPointReference { get; set; } = string.Empty;

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
        /// Type of the auto/manual mode source: 0=Point, 1=GlobalVariable
        /// </summary>
        public int IsAutoType { get; set; }

        /// <summary>
        /// Reference to the auto/manual mode source (GUID string for Point, name for GlobalVariable)
        /// Must be DigitalInput or DigitalOutput when IsAutoType=Point
        /// </summary>
        public string IsAutoReference { get; set; } = string.Empty;

        /// <summary>
        /// Type of the manual value source: 0=Point, 1=GlobalVariable
        /// </summary>
        public int ManualValueType { get; set; }

        /// <summary>
        /// Reference to the manual value source (GUID string for Point, name for GlobalVariable)
        /// Must be AnalogInput or AnalogOutput when ManualValueType=Point
        /// </summary>
        public string ManualValueReference { get; set; } = string.Empty;

        /// <summary>
        /// Type of the reverse output source: 0=Point, 1=GlobalVariable
        /// </summary>
        public int ReverseOutputType { get; set; }

        /// <summary>
        /// Reference to the reverse output source (GUID string for Point, name for GlobalVariable)
        /// Must be DigitalInput or DigitalOutput when ReverseOutputType=Point
        /// </summary>
        public string ReverseOutputReference { get; set; } = string.Empty;

        /// <summary>
        /// Type of the digital output source for hysteresis control: 0=Point, 1=GlobalVariable (optional)
        /// </summary>
        public int? DigitalOutputType { get; set; }

        /// <summary>
        /// Reference to the digital output source for hysteresis control (GUID string for Point, name for GlobalVariable)
        /// Must be DigitalOutput when DigitalOutputType=Point. When configured, enables on/off control based on thresholds.
        /// </summary>
        public string? DigitalOutputReference { get; set; }

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
