namespace API.Models.Dto;

/// <summary>
/// Request DTO for editing PID controller configuration
/// </summary>
public class EditPidControllerRequestDto
{
    /// <summary>
    /// PID controller configuration to update
    /// </summary>
    public PidController Controller { get; set; } = new();
    
    /// <summary>
    /// Represents a PID (Proportional-Integral-Derivative) controller configuration
    /// </summary>
    public class PidController
    {
        /// <summary>
        /// Unique identifier of the PID controller
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// ID of the monitoring item used as process variable (input)
        /// </summary>
        public Guid InputItemId { get; set; }

        /// <summary>
        /// ID of the monitoring item used as control variable (output)
        /// </summary>
        public Guid OutputItemId { get; set; }

        /// <summary>
        /// Proportional gain parameter
        /// </summary>
        public double Kp { get; set; }

        /// <summary>
        /// Integral gain parameter
        /// </summary>
        public double Ki { get; set; }

        /// <summary>
        /// Derivative gain parameter
        /// </summary>
        public double Kd { get; set; }

        /// <summary>
        /// Minimum output value limit
        /// </summary>
        public double OutputMin { get; set; }

        /// <summary>
        /// Maximum output value limit
        /// </summary>
        public double OutputMax { get; set; }

        /// <summary>
        /// Control loop execution interval in milliseconds
        /// </summary>
        public int Interval { get; set; }

        /// <summary>
        /// Whether the PID controller is disabled
        /// </summary>
        public bool IsDisabled { get; set; }

        /// <summary>
        /// Target setpoint value for the controller
        /// </summary>
        public double? SetPoint { get; set; }

        /// <summary>
        /// Filter coefficient for derivative term (0-1)
        /// </summary>
        public double DerivativeFilterAlpha { get; set; }

        /// <summary>
        /// Maximum rate of change for output (units per second)
        /// </summary>
        public double MaxOutputSlewRate { get; set; }

        /// <summary>
        /// Dead zone around setpoint where no control action occurs
        /// </summary>
        public double DeadZone { get; set; }

        /// <summary>
        /// Feed-forward term for disturbance compensation
        /// </summary>
        public double FeedForward { get; set; }

        /// <summary>
        /// Whether the controller is in automatic mode (true) or manual mode (false)
        /// </summary>
        public bool IsAuto { get; set; }

        /// <summary>
        /// Manual output value when controller is in manual mode
        /// </summary>
        public double? ManualValue { get; set; }
    }
}