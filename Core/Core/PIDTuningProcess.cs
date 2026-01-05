using Core.Libs;
using Core.Models;
using Core.RedisModels;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Singleton process for managing PID auto-tuning using Ziegler-Nichols relay feedback method.
/// Runs on a 1-second cycle to perform relay tests, detect oscillations, and calculate optimal PID gains.
/// </summary>
public class PIDTuningProcess
{
    private static PIDTuningProcess? _instance;
    private static readonly object _lock = new();
    private DateTime _lastFetchTime = DateTime.MinValue;
    private const int FetchIntervalSeconds = 5; // Fetch active sessions every 5 seconds
    private List<PIDTuningSession> _activeSessions = new();

    private PIDTuningProcess()
    {
    }

    public static PIDTuningProcess Instance
    {
        get
        {
            lock (_lock)
            {
                return _instance ??= new PIDTuningProcess();
            }
        }
    }

    /// <summary>
    /// Main execution loop for the tuning process. Runs continuously in Worker service.
    /// </summary>
    public async Task Run()
    {
        MyLog.Info("PIDTuningProcess started");

        while (true)
        {
            try
            {
                // Refresh active sessions periodically
                if ((DateTime.Now - _lastFetchTime).TotalSeconds > FetchIntervalSeconds)
                {
                    await FetchActiveSessions();
                    _lastFetchTime = DateTime.Now;
                }

                // Process each active tuning session
                foreach (var session in _activeSessions.ToList())
                {
                    try
                    {
                        await ProcessTuningSession(session);
                    }
                    catch (Exception ex)
                    {
                        MyLog.Error($"Error processing tuning session {session.Id}", ex, new Dictionary<string, object?>
                        {
                            ["SessionId"] = session.Id,
                            ["PIDMemoryId"] = session.PIDMemoryId
                        });
                        
                        await FailSession(session, $"Processing error: {ex.Message}");
                    }
                }

                await Task.Delay(1000); // 1-second cycle
            }
            catch (Exception ex)
            {
                MyLog.Error("Critical error in PIDTuningProcess main loop", ex);
                await Task.Delay(5000); // Back off on critical failure
            }
        }
    }

    /// <summary>
    /// Fetches all active tuning sessions from the database.
    /// </summary>
    private async Task FetchActiveSessions()
    {
        try
        {
            await using var context = new DataContext();
            _activeSessions = await context.PIDTuningSessions
                .Where(s => s.Status == TuningStatus.Initializing || 
                           s.Status == TuningStatus.RelayTest || 
                           s.Status == TuningStatus.AnalyzingData)
                .ToListAsync();

            if (_activeSessions.Any())
            {
                MyLog.Debug($"Found {_activeSessions.Count} active tuning session(s)");
            }
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to fetch active tuning sessions", ex);
        }
    }

    /// <summary>
    /// Processes a single tuning session based on its current status.
    /// </summary>
    private async Task ProcessTuningSession(PIDTuningSession session)
    {
        switch (session.Status)
        {
            case TuningStatus.Initializing:
                await InitializeRelayTest(session);
                break;

            case TuningStatus.RelayTest:
                await ExecuteRelayTest(session);
                break;

            case TuningStatus.AnalyzingData:
                await AnalyzeAndCalculateGains(session);
                break;
        }
    }

    /// <summary>
    /// Initializes the relay test by setting up the tuning state and transitioning to relay mode.
    /// </summary>
    private async Task InitializeRelayTest(PIDTuningSession session)
    {
        MyLog.Info($"Initializing relay test for PID {session.PIDMemoryId}");

        await using var context = new DataContext();
        var pidMemory = await context.PIDMemories.FindAsync(session.PIDMemoryId);
        
        if (pidMemory == null)
        {
            await FailSession(session, "PID memory not found");
            return;
        }

        // Validate cascade: cannot tune if parent is active
        if (pidMemory.ParentPIDId.HasValue)
        {
            var parentPID = await context.PIDMemories.FindAsync(pidMemory.ParentPIDId.Value);
            if (parentPID != null && !parentPID.IsDisabled)
            {
                await FailSession(session, "Cannot tune: Parent PID must be disabled first");
                return;
            }
        }

        // Determine setpoint from dynamic item (required)
        var setPointItem = await Points.GetFinalItem(pidMemory.SetPointId.ToString());
        if (setPointItem == null || !double.TryParse(setPointItem.Value, out var setpoint))
        {
            await FailSession(session, "Cannot read setpoint value");
            return;
        }

        // Calculate relay output levels
        var outputRange = pidMemory.OutputMax - pidMemory.OutputMin;
        var relayAmplitudeValue = outputRange * (session.RelayAmplitude / 100.0);
        var relayOutputHigh = pidMemory.OutputMin + relayAmplitudeValue;
        var relayOutputLow = pidMemory.OutputMin;

        // Create initial tuning state
        var tuningState = new PIDTuningStateRedis
        {
            PIDMemoryId = session.PIDMemoryId,
            SessionId = session.Id,
            Status = TuningStatus.RelayTest,
            SessionStartTime = ((DateTimeOffset)session.StartTime).ToUnixTimeSeconds(),
            RelayHigh = false, // Start with low output
            RelayOutputHigh = relayOutputHigh,
            RelayOutputLow = relayOutputLow,
            SetPoint = setpoint,
            Hysteresis = session.RelayHysteresis,
            LastUpdateTime = DateTimeOffset.Now.ToUnixTimeSeconds()
        };

        await Points.SetPIDTuningState(tuningState);

        // Update session status in database
        session.Status = TuningStatus.RelayTest;
        context.PIDTuningSessions.Update(session);
        await context.SaveChangesAsync();

        MyLog.Info($"Relay test initialized for PID {session.PIDMemoryId}", new Dictionary<string, object?>
        {
            ["SetPoint"] = setpoint,
            ["RelayOutputHigh"] = relayOutputHigh,
            ["RelayOutputLow"] = relayOutputLow,
            ["Hysteresis"] = session.RelayHysteresis
        });
    }

    /// <summary>
    /// Executes the relay test: toggles output based on process variable crossing setpoint,
    /// detects peaks and troughs, and monitors for sufficient oscillation data.
    /// </summary>
    private async Task ExecuteRelayTest(PIDTuningSession session)
    {
        var tuningState = await Points.GetPIDTuningState(session.PIDMemoryId);
        if (tuningState == null)
        {
            await FailSession(session, "Tuning state lost in Redis");
            return;
        }

        await using var context = new DataContext();
        var pidMemory = await context.PIDMemories.FindAsync(session.PIDMemoryId);
        if (pidMemory == null)
        {
            await FailSession(session, "PID memory not found");
            return;
        }

        // Get current process variable
        var inputItem = await Points.GetFinalItem(pidMemory.InputItemId.ToString());
        if (inputItem == null || !double.TryParse(inputItem.Value, out var processVariable))
        {
            tuningState.ConsecutiveFailures++;
            await Points.SetPIDTuningState(tuningState);
            
            if (tuningState.ConsecutiveFailures > 10)
            {
                await FailSession(session, "Cannot read process variable (10 consecutive failures)");
            }
            return;
        }

        tuningState.ConsecutiveFailures = 0; // Reset on successful read
        tuningState.LastUpdateTime = DateTimeOffset.Now.ToUnixTimeSeconds();

        // Check timeout
        var elapsedSeconds = tuningState.LastUpdateTime - tuningState.SessionStartTime;
        if (elapsedSeconds > session.Timeout)
        {
            await FailSession(session, $"Timeout: {session.Timeout} seconds exceeded");
            return;
        }

        // Relay control logic: toggle output when PV crosses setpoint ± hysteresis
        if (!tuningState.RelayHigh && processVariable > (tuningState.SetPoint + tuningState.Hysteresis))
        {
            tuningState.RelayHigh = true;
        }
        else if (tuningState.RelayHigh && processVariable < (tuningState.SetPoint - tuningState.Hysteresis))
        {
            tuningState.RelayHigh = false;
        }

        // Write relay output to controller
        var outputValue = tuningState.RelayHigh ? tuningState.RelayOutputHigh : tuningState.RelayOutputLow;
        await Points.SetRawItem(new RawItemRedis
        {
            ItemId = pidMemory.OutputItemId,
            Value = outputValue.ToString("F2"),
            Time = DateTimeOffset.Now.ToUnixTimeSeconds()
        });

        // Peak/trough detection using sliding window
        DetectPeaksAndTroughs(tuningState, processVariable);

        // Check for sufficient oscillation cycles
        if (tuningState.CycleCount >= session.MinCycles)
        {
            MyLog.Info($"Relay test complete: {tuningState.CycleCount} cycles detected", new Dictionary<string, object?>
            {
                ["PIDMemoryId"] = session.PIDMemoryId,
                ["Peaks"] = tuningState.PeakValues.Count,
                ["Troughs"] = tuningState.TroughValues.Count
            });

            session.Status = TuningStatus.AnalyzingData;
            context.PIDTuningSessions.Update(session);
            await context.SaveChangesAsync();
        }
        else if (tuningState.CycleCount >= session.MaxCycles)
        {
            await FailSession(session, $"Max cycles ({session.MaxCycles}) reached without stable oscillation");
            return;
        }

        // Safety check: amplitude limit
        if (tuningState.MaxAmplitudeObserved > session.MaxAmplitude)
        {
            await FailSession(session, $"Safety abort: Oscillation amplitude {tuningState.MaxAmplitudeObserved:F2}% exceeds limit {session.MaxAmplitude}%");
            return;
        }

        await Points.SetPIDTuningState(tuningState);
    }

    /// <summary>
    /// Detects peaks (maxima) and troughs (minima) in the process variable oscillation.
    /// Uses a 3-point window for robust detection with hysteresis.
    /// </summary>
    private void DetectPeaksAndTroughs(PIDTuningStateRedis tuningState, double currentPV)
    {
        // Initialize sliding window
        if (!tuningState.PreviousProcessVariable2.HasValue)
        {
            tuningState.PreviousProcessVariable2 = currentPV;
            return;
        }
        if (!tuningState.PreviousProcessVariable.HasValue)
        {
            tuningState.PreviousProcessVariable = currentPV;
            return;
        }

        var pv2 = tuningState.PreviousProcessVariable2.Value;
        var pv1 = tuningState.PreviousProcessVariable.Value;
        var pv0 = currentPV;

        var currentTime = DateTimeOffset.Now.ToUnixTimeSeconds();

        // Detect peak: pv2 < pv1 > pv0 (and above setpoint)
        if (pv1 > pv2 && pv1 > pv0 && pv1 > tuningState.SetPoint)
        {
            // Only add if significantly different from last peak (avoid noise)
            if (tuningState.PeakValues.Count == 0 || 
                Math.Abs(pv1 - tuningState.PeakValues.Last()) > tuningState.Hysteresis)
            {
                tuningState.PeakValues.Add(pv1);
                tuningState.PeakTimes.Add(currentTime);
                
                MyLog.Debug($"Peak detected: {pv1:F2} at time {currentTime}");
            }
        }

        // Detect trough: pv2 > pv1 < pv0 (and below setpoint)
        if (pv1 < pv2 && pv1 < pv0 && pv1 < tuningState.SetPoint)
        {
            // Only add if significantly different from last trough
            if (tuningState.TroughValues.Count == 0 || 
                Math.Abs(pv1 - tuningState.TroughValues.Last()) > tuningState.Hysteresis)
            {
                tuningState.TroughValues.Add(pv1);
                tuningState.TroughTimes.Add(currentTime);
                
                MyLog.Debug($"Trough detected: {pv1:F2} at time {currentTime}");
            }
        }

        // Count complete cycles (need both peak and trough)
        var minCount = Math.Min(tuningState.PeakValues.Count, tuningState.TroughValues.Count);
        tuningState.CycleCount = minCount;

        // Calculate amplitude safety check
        if (tuningState.PeakValues.Any() && tuningState.TroughValues.Any())
        {
            var avgPeak = tuningState.PeakValues.Average();
            var avgTrough = tuningState.TroughValues.Average();
            var amplitude = avgPeak - avgTrough;
            
            // Express as percentage of setpoint (if setpoint > 0)
            if (tuningState.SetPoint > 0)
            {
                tuningState.MaxAmplitudeObserved = (amplitude / tuningState.SetPoint) * 100.0;
            }
        }

        // Shift sliding window
        tuningState.PreviousProcessVariable2 = pv1;
        tuningState.PreviousProcessVariable = pv0;
    }

    /// <summary>
    /// Analyzes oscillation data and calculates PID gains using Ziegler-Nichols formulas.
    /// </summary>
    private async Task AnalyzeAndCalculateGains(PIDTuningSession session)
    {
        MyLog.Info($"Analyzing oscillation data for PID {session.PIDMemoryId}");

        var tuningState = await Points.GetPIDTuningState(session.PIDMemoryId);
        if (tuningState == null)
        {
            await FailSession(session, "Tuning state lost in Redis");
            return;
        }

        // Validate sufficient data
        if (tuningState.PeakValues.Count < 2 || tuningState.TroughValues.Count < 2)
        {
            await FailSession(session, "Insufficient oscillation data (need at least 2 peaks and 2 troughs)");
            return;
        }

        // Calculate ultimate period (Pu) - average time between consecutive peaks
        var periods = new List<double>();
        for (int i = 1; i < tuningState.PeakTimes.Count; i++)
        {
            periods.Add(tuningState.PeakTimes[i] - tuningState.PeakTimes[i - 1]);
        }

        if (!periods.Any())
        {
            await FailSession(session, "Cannot calculate period: insufficient peak data");
            return;
        }

        var ultimatePeriod = periods.Average();

        // Calculate oscillation amplitude (a) - average peak-to-peak
        var amplitudes = new List<double>();
        for (int i = 0; i < Math.Min(tuningState.PeakValues.Count, tuningState.TroughValues.Count); i++)
        {
            amplitudes.Add(tuningState.PeakValues[i] - tuningState.TroughValues[i]);
        }

        var oscillationAmplitude = amplitudes.Average();

        // Calculate relay amplitude (d)
        var relayAmplitude = tuningState.RelayOutputHigh - tuningState.RelayOutputLow;

        // Calculate critical gain (Ku) using Ziegler-Nichols formula: Ku = 4d / (πa)
        var criticalGain = (4.0 * relayAmplitude) / (Math.PI * oscillationAmplitude);

        // Calculate PID gains using Ziegler-Nichols formulas
        var calculatedKp = 0.6 * criticalGain;
        var calculatedKi = 1.2 * criticalGain / ultimatePeriod;
        var calculatedKd = 0.075 * criticalGain * ultimatePeriod;

        // Calculate confidence score based on period consistency
        var confidenceScore = CalculateConfidenceScore(periods);

        // Update session with results
        await using var context = new DataContext();
        var dbSession = await context.PIDTuningSessions.FindAsync(session.Id);
        if (dbSession == null) return;

        dbSession.UltimatePeriod = ultimatePeriod;
        dbSession.OscillationAmplitude = oscillationAmplitude;
        dbSession.CriticalGain = criticalGain;
        dbSession.CalculatedKp = calculatedKp;
        dbSession.CalculatedKi = calculatedKi;
        dbSession.CalculatedKd = calculatedKd;
        dbSession.ConfidenceScore = confidenceScore;
        dbSession.Status = TuningStatus.Completed;
        dbSession.EndTime = DateTime.UtcNow;

        await context.SaveChangesAsync();

        // Clean up tuning state from Redis
        await Points.DeletePIDTuningState(session.PIDMemoryId);

        MyLog.Info($"Auto-tuning completed successfully for PID {session.PIDMemoryId}", new Dictionary<string, object?>
        {
            ["Pu"] = ultimatePeriod,
            ["Amplitude"] = oscillationAmplitude,
            ["Ku"] = criticalGain,
            ["Kp"] = calculatedKp,
            ["Ki"] = calculatedKi,
            ["Kd"] = calculatedKd,
            ["Confidence"] = confidenceScore
        });
    }

    /// <summary>
    /// Calculates confidence score (0-1) based on cycle-to-cycle consistency.
    /// Higher values indicate more reliable tuning results.
    /// </summary>
    private double CalculateConfidenceScore(List<double> periods)
    {
        if (periods.Count < 2) return 0.0;

        var mean = periods.Average();
        var variance = periods.Select(p => Math.Pow(p - mean, 2)).Average();
        var stdDev = Math.Sqrt(variance);

        // Coefficient of variation (CV) - lower is better
        var coefficientOfVariation = stdDev / mean;

        // Convert to confidence score: 0.1 CV = 0.9 confidence, 0.5 CV = 0.5 confidence
        var confidence = Math.Max(0.0, 1.0 - coefficientOfVariation);

        return confidence;
    }

    /// <summary>
    /// Marks a tuning session as failed with an error message.
    /// </summary>
    private async Task FailSession(PIDTuningSession session, string errorMessage)
    {
        MyLog.Warning($"Tuning session failed for PID {session.PIDMemoryId}: {errorMessage}");

        await using var context = new DataContext();
        var dbSession = await context.PIDTuningSessions.FindAsync(session.Id);
        if (dbSession == null) return;

        dbSession.Status = TuningStatus.Failed;
        dbSession.ErrorMessage = errorMessage;
        dbSession.EndTime = DateTime.UtcNow;

        await context.SaveChangesAsync();

        // Clean up tuning state from Redis
        await Points.DeletePIDTuningState(session.PIDMemoryId);

        // Remove from active list
        _activeSessions.RemoveAll(s => s.Id == session.Id);
    }

    /// <summary>
    /// Aborts an active tuning session (called via API).
    /// </summary>
    public async Task<bool> AbortTuning(Guid pidMemoryId)
    {
        try
        {
            await using var context = new DataContext();
            var session = await context.PIDTuningSessions
                .Where(s => s.PIDMemoryId == pidMemoryId && 
                           (s.Status == TuningStatus.Initializing || 
                            s.Status == TuningStatus.RelayTest || 
                            s.Status == TuningStatus.AnalyzingData))
                .FirstOrDefaultAsync();

            if (session == null)
            {
                MyLog.Warning($"No active tuning session found for PID {pidMemoryId}");
                return false;
            }

            session.Status = TuningStatus.Aborted;
            session.ErrorMessage = "Manually aborted by user";
            session.EndTime = DateTime.UtcNow;

            await context.SaveChangesAsync();

            // Clean up tuning state from Redis
            await Points.DeletePIDTuningState(pidMemoryId);

            // Remove from active list
            _activeSessions.RemoveAll(s => s.Id == session.Id);

            MyLog.Info($"Tuning session aborted for PID {pidMemoryId}");
            return true;
        }
        catch (Exception ex)
        {
            MyLog.Error($"Failed to abort tuning for PID {pidMemoryId}", ex);
            return false;
        }
    }
}
