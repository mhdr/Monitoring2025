namespace Core.Libs;

/// <summary>
/// A Proportional-Integral-Derivative (PID) Controller implementation.
/// 
/// This controller calculates an output value based on the error between a setpoint and
/// a measured process variable. It uses three terms:
/// - Proportional: Responds to present error (Kp)
/// - Integral: Responds to accumulated error over time (Ki) 
/// - Derivative: Responds to rate of change of error (Kd)
/// 
/// Features include output limiting, anti-windup protection, derivative filtering,
/// slew rate limiting, and support for both direct and reverse acting control.
/// </summary>
public class PIDController
{
    /// <summary>
    /// Lock object for thread safety
    /// </summary>
    private readonly object _lock = new object();
    
    /// <summary>
    /// Proportional gain
    /// </summary>
    public double Kp { get; set; }

    /// <summary>
    /// Integral gain
    /// </summary>
    public double Ki { get; set; }

    /// <summary>
    /// Derivative gain
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
    /// Maximum rate of change of the output per second
    /// </summary>
    public double MaxOutputSlewRate { get; set; } = double.PositiveInfinity;

    /// <summary>
    /// Feedforward term
    /// </summary>
    public double FeedForward { get; set; } = 0.0;

    /// <summary>
    /// Determines if the output should be reversed (for normally closed devices)
    /// When true, the output will be reversed (OutputMax becomes min, OutputMin becomes max)
    /// </summary>
    public bool ReverseOutput { get; set; } = false;

    /// <summary>
    /// Deadband region where error is considered zero (to prevent oscillation)
    /// </summary>
    private double _deadZone;
    
    /// <summary>
    /// Filter coefficient for derivative term (1.0 = no filtering)
    /// </summary>
    private double _derivativeFilterAlpha = 1.0;
    
    /// <summary>
    /// Current filtered derivative value
    /// </summary>
    private double _filteredDerivative;
    
    /// <summary>
    /// Accumulated integral term
    /// </summary>
    private double _integralTerm;
    
    /// <summary>
    /// Previous process variable value used for derivative calculation
    /// </summary>
    private double _previousProcessVariable = double.NaN;
    
    /// <summary>
    /// Previous controller output value used for slew rate limiting
    /// </summary>
    private double _previousOutput = double.NaN;

    /// <summary>
    /// Creates a new PID controller with specified gains and output limits.
    /// </summary>
    /// <param name="kp">Proportional gain - responds to present error</param>
    /// <param name="ki">Integral gain - responds to accumulated error</param>
    /// <param name="kd">Derivative gain - responds to rate of change of error</param>
    /// <param name="outputMin">Minimum allowed output value</param>
    /// <param name="outputMax">Maximum allowed output value</param>
    public PIDController(double kp, double ki, double kd, double outputMin, double outputMax)
    {
        Kp = kp;
        Ki = ki;
        Kd = kd;
        OutputMin = outputMin;
        OutputMax = outputMax;
        Reset();
    }

    /// <summary>
    /// Creates a new PID controller with specified gains, output limits, and output direction.
    /// </summary>
    /// <param name="kp">Proportional gain - responds to present error</param>
    /// <param name="ki">Integral gain - responds to accumulated error</param>
    /// <param name="kd">Derivative gain - responds to rate of change of error</param>
    /// <param name="outputMin">Minimum allowed output value</param>
    /// <param name="outputMax">Maximum allowed output value</param>
    /// <param name="reverseOutput">When true, output action is reversed (typically for normally closed devices)</param>
    public PIDController(double kp, double ki, double kd, double outputMin, double outputMax, bool reverseOutput)
        : this(kp, ki, kd, outputMin, outputMax)
    {
        ReverseOutput = reverseOutput;
    }

    /// <summary>
    /// Range around setpoint where error is considered zero
    /// </summary>
    public double DeadZone
    {
        get => _deadZone;
        set => _deadZone = Math.Max(value, 0);
    }

    /// <summary>
    /// Derivative term smoothing factor (0.0-1.0)
    /// 1.0 = no filtering, 0.0 = maximum filtering
    /// 
    /// Filter Tuning Tips:
    /// Start with DerivativeFilterAlpha = 1.0 (no filtering) to match original behavior
    /// Gradually reduce alpha (try 0.2-0.4) until high-frequency noise is sufficiently attenuated
    /// Higher alpha = faster response but more noise
    /// Lower alpha = smoother output but slower response to rapid changes
    /// 
    /// </summary>
    public double DerivativeFilterAlpha
    {
        get => _derivativeFilterAlpha;
        set => _derivativeFilterAlpha = Math.Clamp(value, 0.0, 1.0);
    }

    /// <summary>
    /// Computes the control output based on the current process variable and setpoint.
    /// </summary>
    public double Compute(double setpoint, double processVariable, double deltaTime)
    {
        lock (_lock)
        {
            ValidateDeltaTime(deltaTime);

            double error = CalculateError(setpoint, processVariable);
            double proportional = CalculateProportional(error);
            double integral = CalculateIntegral(error, deltaTime);
            double derivative = CalculateDerivative(processVariable, deltaTime);

            double output = ApplyFeedForward(proportional, integral, derivative);
            output = ApplyOutputClamping(output);
            output = ApplyAntiWindup(output, proportional, derivative);
            output = ApplyOutputRamping(output, deltaTime);

            // Apply output reversal if needed
            output = ApplyOutputReversal(output);

            _previousOutput = output;
            return output;
        }
    }

    /// <summary>
    /// Prepares for bumpless transfer by initializing controller state
    /// to match a desired output and current conditions
    /// </summary>
    /// <param name="desiredOutput">Output value the controller should start from</param>
    /// <param name="processVariable">Current process measurement</param>
    /// <param name="setpoint">Target setpoint</param>
    public void InitializeForBumplessTransfer(double desiredOutput, double processVariable, double setpoint)
    {
        // If we're in reverse mode, we need to un-reverse the desired output for internal calculations
        if (ReverseOutput)
        {
            desiredOutput = ReverseOutputValue(desiredOutput);
        }

        double error = CalculateError(setpoint, processVariable);
        double proportional = CalculateProportional(error);

        if (Ki != 0)
        {
            _integralTerm = (desiredOutput - proportional - FeedForward) / Ki;
        }
        else
        {
            _integralTerm = 0;
        }

        ResetDerivativeState(processVariable);
        _previousOutput = desiredOutput;
    }

    /// <summary>
    /// Resets the controller's internal state.
    /// </summary>
    public void Reset()
    {
        _integralTerm = 0.0;
        _previousProcessVariable = double.NaN;
        _filteredDerivative = 0.0;
        _previousOutput = double.NaN;
    }

    #region Private Methods

    /// <summary>
    /// Ensures deltaTime is positive to prevent calculation errors
    /// </summary>
    /// <param name="deltaTime">Time elapsed since last computation</param>
    /// <exception cref="ArgumentException">Thrown if deltaTime is zero or negative</exception>
    private void ValidateDeltaTime(double deltaTime)
    {
        if (deltaTime <= 0)
            throw new ArgumentException("deltaTime must be greater than zero.");
    }

    /// <summary>
    /// Calculates error between setpoint and process variable, applying deadzone if configured
    /// </summary>
    /// <param name="setpoint">Desired target value</param>
    /// <param name="processVariable">Current measured value</param>
    /// <returns>Calculated error value (0 if within deadzone)</returns>
    private double CalculateError(double setpoint, double processVariable)
    {
        double error = setpoint - processVariable;
        return Math.Abs(error) <= DeadZone ? 0 : error;
    }

    /// <summary>
    /// Calculates the proportional term of the PID algorithm
    /// </summary>
    /// <param name="error">Current error value</param>
    /// <returns>Proportional contribution to output</returns>
    private double CalculateProportional(double error)
    {
        return Kp * error;
    }

    /// <summary>
    /// Calculates the integral term of the PID algorithm by accumulating error over time
    /// </summary>
    /// <param name="error">Current error value</param>
    /// <param name="deltaTime">Time elapsed since last computation</param>
    /// <returns>Integral contribution to output</returns>
    private double CalculateIntegral(double error, double deltaTime)
    {
        _integralTerm += error * deltaTime;
        return Ki * _integralTerm;
    }

    /// <summary>
    /// Calculates the derivative term of the PID algorithm using filtered derivative
    /// </summary>
    /// <param name="processVariable">Current measured value</param>
    /// <param name="deltaTime">Time elapsed since last computation</param>
    /// <returns>Derivative contribution to output</returns>
    private double CalculateDerivative(double processVariable, double deltaTime)
    {
        double derivative = 0;
        if (!double.IsNaN(_previousProcessVariable))
        {
            double rawDerivative = Kd * (_previousProcessVariable - processVariable) / deltaTime;
            _filteredDerivative = (1 - _derivativeFilterAlpha) * _filteredDerivative + _derivativeFilterAlpha * rawDerivative;
            derivative = _filteredDerivative;
        }
        _previousProcessVariable = processVariable;
        return derivative;
    }

    /// <summary>
    /// Combines proportional, integral, derivative terms and feedforward value
    /// </summary>
    /// <returns>Raw controller output before limiting</returns>
    private double ApplyFeedForward(double proportional, double integral, double derivative)
    {
        return proportional + integral + derivative + FeedForward;
    }

    /// <summary>
    /// Limits output to configured min/max values
    /// </summary>
    /// <param name="output">Raw controller output</param>
    /// <returns>Clamped output value</returns>
    private double ApplyOutputClamping(double output)
    {
        return Math.Clamp(output, OutputMin, OutputMax);
    }

    /// <summary>
    /// Implements anti-windup by adjusting integral term when output saturates
    /// </summary>
    /// <param name="output">Clamped output value</param>
    /// <param name="proportional">Current proportional term</param>
    /// <param name="derivative">Current derivative term</param>
    /// <returns>Final output value after anti-windup</returns>
    private double ApplyAntiWindup(double output, double proportional, double derivative)
    {
        if (Ki != 0 && output != (proportional + derivative + FeedForward))
        {
            _integralTerm = (output - proportional - derivative - FeedForward) / Ki;
        }
        return output;
    }

    /// <summary>
    /// Limits rate of change of output based on MaxOutputSlewRate
    /// </summary>
    /// <param name="output">Calculated output value</param>
    /// <param name="deltaTime">Time elapsed since last computation</param>
    /// <returns>Output with limited rate of change</returns>
    private double ApplyOutputRamping(double output, double deltaTime)
    {
        if (!double.IsNaN(_previousOutput))
        {
            double maxChange = MaxOutputSlewRate * deltaTime;
            output = Math.Clamp(output, _previousOutput - maxChange, _previousOutput + maxChange);
            output = Math.Clamp(output, OutputMin, OutputMax);
        }
        return output;
    }

    /// <summary>
    /// Reverses the output if ReverseOutput is true
    /// For normally closed devices, we invert the output within the valid range
    /// </summary>
    private double ApplyOutputReversal(double output)
    {
        if (ReverseOutput)
        {
            return ReverseOutputValue(output);
        }
        return output;
    }

    /// <summary>
    /// Reverses an output value within the valid output range
    /// </summary>
    private double ReverseOutputValue(double output)
    {
        // Calculate the reversed value within the valid range
        // This maps OutputMin to OutputMax and vice versa
        return OutputMax + OutputMin - output;
    }

    /// <summary>
    /// Resets the derivative calculation state to prepare for a new control sequence
    /// </summary>
    /// <param name="processVariable">Current process measurement to initialize state</param>
    private void ResetDerivativeState(double processVariable)
    {
        _previousProcessVariable = processVariable;
        _filteredDerivative = 0;
    }

    #endregion

    #region State Persistence Methods

    /// <summary>
    /// Gets the current internal state of the PID controller for persistence
    /// </summary>
    /// <returns>Tuple containing (IntegralTerm, PreviousProcessVariable, FilteredDerivative, PreviousOutput)</returns>
    public (double IntegralTerm, double PreviousProcessVariable, double FilteredDerivative, double PreviousOutput) GetState()
    {
        lock (_lock)
        {
            return (_integralTerm, _previousProcessVariable, _filteredDerivative, _previousOutput);
        }
    }

    /// <summary>
    /// Restores the internal state of the PID controller from persisted values
    /// </summary>
    /// <param name="integralTerm">Accumulated integral term</param>
    /// <param name="previousProcessVariable">Previous process variable value</param>
    /// <param name="filteredDerivative">Current filtered derivative value</param>
    /// <param name="previousOutput">Previous controller output value</param>
    public void SetState(double integralTerm, double previousProcessVariable, double filteredDerivative, double previousOutput)
    {
        lock (_lock)
        {
            _integralTerm = integralTerm;
            _previousProcessVariable = previousProcessVariable;
            _filteredDerivative = filteredDerivative;
            _previousOutput = previousOutput;
        }
    }

    #endregion
}
