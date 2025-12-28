using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for editing an existing PID memory configuration
/// </summary>
public class EditPIDMemoryRequestDto
{
    /// <summary>
    /// ID of the PID memory to edit
    /// </summary>
    [Required(ErrorMessage = "ID is required")]
    public Guid Id { get; set; }

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
    public double Kp { get; set; }

    /// <summary>
    /// Integral gain (Ki)
    /// </summary>
    [Required(ErrorMessage = "Ki is required")]
    public double Ki { get; set; }

    /// <summary>
    /// Derivative gain (Kd)
    /// </summary>
    [Required(ErrorMessage = "Kd is required")]
    public double Kd { get; set; }

    /// <summary>
    /// Minimum output value
    /// </summary>
    [Required(ErrorMessage = "OutputMin is required")]
    public double OutputMin { get; set; }

    /// <summary>
    /// Maximum output value
    /// </summary>
    [Required(ErrorMessage = "OutputMax is required")]
    public double OutputMax { get; set; }

    /// <summary>
    /// Execution interval in seconds (must be greater than 0)
    /// </summary>
    [Required(ErrorMessage = "Interval is required")]
    [Range(1, int.MaxValue, ErrorMessage = "Interval must be greater than 0")]
    public int Interval { get; set; }

    /// <summary>
    /// Whether the PID controller is disabled
    /// </summary>
    public bool IsDisabled { get; set; }

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
    public double DerivativeFilterAlpha { get; set; }

    /// <summary>
    /// Maximum output slew rate
    /// </summary>
    [Range(0.0, double.MaxValue, ErrorMessage = "MaxOutputSlewRate must be non-negative")]
    public double MaxOutputSlewRate { get; set; }

    /// <summary>
    /// Dead zone around setpoint
    /// </summary>
    [Range(0.0, double.MaxValue, ErrorMessage = "DeadZone must be non-negative")]
    public double DeadZone { get; set; }

    /// <summary>
    /// Feed-forward term
    /// </summary>
    public double FeedForward { get; set; }

    /// <summary>
    /// Static auto/manual mode flag
    /// </summary>
    public bool IsAuto { get; set; }

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
    public bool ReverseOutput { get; set; }

    /// <summary>
    /// ID of monitoring item for dynamic reverse output (DigitalInput or DigitalOutput)
    /// </summary>
    public Guid? ReverseOutputId { get; set; }
}
