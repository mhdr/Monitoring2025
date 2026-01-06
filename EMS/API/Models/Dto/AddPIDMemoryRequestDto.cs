using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for creating a new PID memory configuration
/// </summary>
public class AddPIDMemoryRequestDto
{
    /// <summary>
    /// Human-readable name for the PID controller
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Type of the input source: 0=Point, 1=GlobalVariable
    /// </summary>
    public int InputType { get; set; } = 0;

    /// <summary>
    /// Reference to the input source (GUID string for Point, name for GlobalVariable)
    /// Must be AnalogInput when InputType=Point
    /// </summary>
    [Required(ErrorMessage = "Input reference is required")]
    public string InputReference { get; set; } = string.Empty;

    /// <summary>
    /// Type of the output source: 0=Point, 1=GlobalVariable
    /// </summary>
    public int OutputType { get; set; } = 0;

    /// <summary>
    /// Reference to the output source (GUID string for Point, name for GlobalVariable)
    /// Must be AnalogOutput when OutputType=Point
    /// </summary>
    [Required(ErrorMessage = "Output reference is required")]
    public string OutputReference { get; set; } = string.Empty;

    /// <summary>
    /// Proportional gain (Kp)
    /// </summary>
    [Required(ErrorMessage = "Kp is required")]
    public double Kp { get; set; } = 1.0;

    /// <summary>
    /// Integral gain (Ki)
    /// </summary>
    [Required(ErrorMessage = "Ki is required")]
    public double Ki { get; set; } = 0.1;

    /// <summary>
    /// Derivative gain (Kd)
    /// </summary>
    [Required(ErrorMessage = "Kd is required")]
    public double Kd { get; set; } = 0.05;

    /// <summary>
    /// Minimum output value
    /// </summary>
    [Required(ErrorMessage = "OutputMin is required")]
    public double OutputMin { get; set; } = 0.0;

    /// <summary>
    /// Maximum output value
    /// </summary>
    [Required(ErrorMessage = "OutputMax is required")]
    public double OutputMax { get; set; } = 100.0;

    /// <summary>
    /// Execution interval in seconds (must be greater than 0)
    /// </summary>
    [Required(ErrorMessage = "Interval is required")]
    [Range(1, int.MaxValue, ErrorMessage = "Interval must be greater than 0")]
    public int Interval { get; set; } = 10;

    /// <summary>
    /// Whether the PID controller is disabled
    /// </summary>
    public bool IsDisabled { get; set; } = false;

    /// <summary>
    /// Type of the setpoint source: 0=Point, 1=GlobalVariable
    /// </summary>
    public int SetPointType { get; set; } = 0;

    /// <summary>
    /// Reference to the setpoint source (GUID string for Point, name for GlobalVariable)
    /// Must be AnalogInput or AnalogOutput when SetPointType=Point
    /// Required for PID operation
    /// </summary>
    [Required(ErrorMessage = "SetPoint reference is required")]
    public string SetPointReference { get; set; } = string.Empty;

    /// <summary>
    /// Derivative filter alpha (0-1)
    /// </summary>
    [Range(0.0, 1.0, ErrorMessage = "DerivativeFilterAlpha must be between 0 and 1")]
    public double DerivativeFilterAlpha { get; set; } = 1.0;

    /// <summary>
    /// Maximum output slew rate
    /// </summary>
    [Range(0.0, double.MaxValue, ErrorMessage = "MaxOutputSlewRate must be non-negative")]
    public double MaxOutputSlewRate { get; set; } = 100.0;

    /// <summary>
    /// Dead zone around setpoint
    /// </summary>
    [Range(0.0, double.MaxValue, ErrorMessage = "DeadZone must be non-negative")]
    public double DeadZone { get; set; } = 0.0;

    /// <summary>
    /// Feed-forward term
    /// </summary>
    public double FeedForward { get; set; } = 0.0;

    /// <summary>
    /// Type of the auto/manual mode source: 0=Point, 1=GlobalVariable
    /// </summary>
    public int IsAutoType { get; set; } = 0;

    /// <summary>
    /// Reference to the auto/manual mode source (GUID string for Point, name for GlobalVariable)
    /// Must be DigitalInput or DigitalOutput when IsAutoType=Point
    /// Required for PID operation
    /// </summary>
    [Required(ErrorMessage = "IsAuto reference is required")]
    public string IsAutoReference { get; set; } = string.Empty;

    /// <summary>
    /// Type of the manual value source: 0=Point, 1=GlobalVariable
    /// </summary>
    public int ManualValueType { get; set; } = 0;

    /// <summary>
    /// Reference to the manual value source (GUID string for Point, name for GlobalVariable)
    /// Must be AnalogInput or AnalogOutput when ManualValueType=Point
    /// Required for PID operation
    /// </summary>
    [Required(ErrorMessage = "ManualValue reference is required")]
    public string ManualValueReference { get; set; } = string.Empty;

    /// <summary>
    /// Type of the reverse output source: 0=Point, 1=GlobalVariable
    /// </summary>
    public int ReverseOutputType { get; set; } = 0;

    /// <summary>
    /// Reference to the reverse output source (GUID string for Point, name for GlobalVariable)
    /// Must be DigitalInput or DigitalOutput when ReverseOutputType=Point
    /// Required for PID operation
    /// </summary>
    [Required(ErrorMessage = "ReverseOutput reference is required")]
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
    /// Default: 75.0
    /// </summary>
    [Range(0.0, double.MaxValue, ErrorMessage = "HysteresisHighThreshold must be non-negative")]
    public double HysteresisHighThreshold { get; set; } = 75.0;

    /// <summary>
    /// Low threshold for hysteresis control (turn OFF when output &lt;= this value)
    /// Default: 25.0. Must be less than HysteresisHighThreshold.
    /// </summary>
    [Range(0.0, double.MaxValue, ErrorMessage = "HysteresisLowThreshold must be non-negative")]
    public double HysteresisLowThreshold { get; set; } = 25.0;
    
    /// <summary>
    /// Parent PID ID for cascaded control (optional)
    /// For cascaded control, parent PID's output must match this PID's setpoint
    /// </summary>
    public Guid? ParentPIDId { get; set; }
    
    /// <summary>
    /// Cascade level: 0 = standalone/outer, 1 = outer in cascade, 2 = inner in cascade
    /// Default: 0. Must be set appropriately if ParentPIDId is specified.
    /// </summary>
    [Range(0, 2, ErrorMessage = "CascadeLevel must be between 0 and 2")]
    public int CascadeLevel { get; set; } = 0;
}
