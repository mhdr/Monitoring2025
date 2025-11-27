namespace Core.Libs;

/// <summary>
/// A Room Temperature Controller that manages heating and cooling using two separate PID controllers.
/// </summary>
public class RoomTemperatureController
{
    private PIDController _heatingPID;
    private PIDController _coolingPID;
    private double _setpoint;
    private double _deadband;

    // Flags to track active state of heating and cooling
    private bool _isHeatingActive = false;
    private bool _isCoolingActive = false;

    /// <summary>
    /// Creates a new RoomTemperatureController with specified setpoint and deadband.
    /// </summary>
    /// <param name="setpoint">The desired room temperature.</param>
    /// <param name="deadband">The range around the setpoint where neither heating nor cooling is active.</param>
    public RoomTemperatureController(double setpoint, double deadband)
    {
        _setpoint = setpoint;
        _deadband = Math.Max(deadband, 0); // Ensure deadband is non-negative

        // Initialize PID controllers for heating and cooling
        _heatingPID = new PIDController(kp: 1.0, ki: 0.1, kd: 0.05, outputMin: 0, outputMax: 100);
        _coolingPID = new PIDController(kp: 1.0, ki: 0.1, kd: 0.05, outputMin: 0, outputMax: 100);
    }

    /// <summary>
    /// Controls the room temperature by activating either heating or cooling based on the current temperature.
    /// </summary>
    /// <param name="currentTemperature">The current room temperature measured by the sensor.</param>
    /// <param name="deltaTime">The time elapsed since the last control cycle (in seconds).</param>
    public void Control(double currentTemperature, double deltaTime)
    {
        if (deltaTime <= 0)
            throw new ArgumentException("deltaTime must be greater than zero.");

        if (currentTemperature < _setpoint - _deadband)
        {
            // Activate heating PID and reset cooling PID
            if (!_isHeatingActive)
            {
                _coolingPID.Reset();
                _isHeatingActive = true;
                _isCoolingActive = false;
            }

            double heatingOutput = _heatingPID.Compute(_setpoint, currentTemperature, deltaTime);
            Console.WriteLine($"Heating Output: {heatingOutput:F2}");
        }
        else if (currentTemperature > _setpoint + _deadband)
        {
            // Activate cooling PID and reset heating PID
            if (!_isCoolingActive)
            {
                _heatingPID.Reset();
                _isCoolingActive = true;
                _isHeatingActive = false;
            }

            double coolingOutput = _coolingPID.Compute(_setpoint, currentTemperature, deltaTime);
            Console.WriteLine($"Cooling Output: {coolingOutput:F2}");
        }
        else
        {
            // Within deadband. No action, but reset both controllers to ensure clean state
            _isHeatingActive = false;
            _isCoolingActive = false;
            _heatingPID.Reset();
            _coolingPID.Reset();
            Console.WriteLine("Within deadband. No action.");
        }
    }

    /// <summary>
    /// Updates the setpoint for the room temperature controller.
    /// </summary>
    /// <param name="newSetpoint">The new desired room temperature.</param>
    public void UpdateSetpoint(double newSetpoint)
    {
        _setpoint = newSetpoint;
    }

    /// <summary>
    /// Updates the deadband for the room temperature controller.
    /// </summary>
    /// <param name="newDeadband">The new deadband range around the setpoint.</param>
    public void UpdateDeadband(double newDeadband)
    {
        _deadband = Math.Max(newDeadband, 0); // Ensure deadband is non-negative
    }
}