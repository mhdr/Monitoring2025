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
    /// ID of the monitoring item for process variable (input)
    /// Must be AnalogInput
    /// </summary>
    [Required(ErrorMessage = "Input item ID is required")]
    public Guid InputItemId { get; set; }

    /// <summary>
    /// ID of the monitoring item for control output
    /// Must be AnalogOutput
    /// </summary>
    [Required(ErrorMessage = "Output item ID is required")]
    public Guid OutputItemId { get; set; }

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
    /// Static setpoint value
    /// </summary>
    public double? SetPoint { get; set; }

    /// <summary>
    /// ID of monitoring item for dynamic setpoint (AnalogInput or AnalogOutput)
    /// </summary>
    public Guid? SetPointId { get; set; }

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
    /// Static auto/manual mode flag
    /// </summary>
    public bool IsAuto { get; set; } = true;

    /// <summary>
    /// ID of monitoring item for dynamic auto/manual mode (DigitalInput or DigitalOutput)
    /// </summary>
    public Guid? IsAutoId { get; set; }

    /// <summary>
    /// Static manual mode output value
    /// </summary>
    public double? ManualValue { get; set; }

    /// <summary>
    /// ID of monitoring item for dynamic manual value (AnalogInput or AnalogOutput)
    /// </summary>
    public Guid? ManualValueId { get; set; }

    /// <summary>
    /// Static reverse output flag
    /// </summary>
    public bool ReverseOutput { get; set; } = false;

    /// <summary>
    /// ID of monitoring item for dynamic reverse output (DigitalInput or DigitalOutput)
    /// </summary>
    public Guid? ReverseOutputId { get; set; }

    /// <summary>
    /// ID of digital output item for hysteresis control (optional)
    /// Must be DigitalOutput type. When configured, enables on/off control based on thresholds.
    /// </summary>
    public Guid? DigitalOutputItemId { get; set; }

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
