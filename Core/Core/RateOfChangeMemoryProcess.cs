using Core.Libs;
using Core.Models;
using Core.RedisModels;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Processor for Rate of Change Memory with multiple calculation methods,
/// baseline establishment, exponential smoothing, and hysteresis-based alarms
/// </summary>
public class RateOfChangeMemoryProcess
{
    // Singleton instance
    private static RateOfChangeMemoryProcess? _instance;
    private static readonly object _lock = new object();
    private static Task? _runTask;

    private DataContext? _context;

    // Track last execution time for each memory to respect interval
    private readonly Dictionary<Guid, long> _lastExecutionTimes = new();

    // Private constructor to enforce Singleton
    private RateOfChangeMemoryProcess()
    {
        _context = null;
    }

    // Singleton instance access
    public static RateOfChangeMemoryProcess Instance
    {
        get
        {
            lock (_lock)
            {
                if (_instance == null)
                {
                    _instance = new RateOfChangeMemoryProcess();
                }
            }

            return _instance;
        }
    }

    public async Task Run()
    {
        lock (_lock)
        {
            if (_runTask == null)
            {
                _runTask = Task.Run(async () =>
                {
                    // Wait for database to be ready at startup
                    await WaitForDatabaseConnection();
                    
                    while (true)
                    {
                        try
                        {
                            await using (_context = new DataContext())
                            {
                                await Process();
                            }
                        }
                        catch (Exception ex)
                        {
                            MyLog.LogJson(ex);
                        }
                        finally
                        {
                            await Task.Delay(1000); // Delay to prevent rapid loops
                        }
                    }
                });
            }
        }

        await _runTask;
    }

    private async Task WaitForDatabaseConnection()
    {
        int maxRetries = 30;
        int retryDelay = 2000; // 2 seconds

        for (int i = 0; i < maxRetries; i++)
        {
            try
            {
                using var testContext = new DataContext();
                await testContext.Database.CanConnectAsync();
                MyLog.Info("RateOfChangeMemoryProcess: Database connection established");
                return;
            }
            catch (Exception ex)
            {
                MyLog.Info($"RateOfChangeMemoryProcess: Waiting for database connection... Attempt {i + 1}/{maxRetries}");
                if (i == maxRetries - 1)
                {
                    MyLog.LogJson(ex);
                    throw;
                }
                await Task.Delay(retryDelay);
            }
        }
    }

    public async Task Process()
    {
        var memories = await _context!.RateOfChangeMemories
            .Where(m => !m.IsDisabled)
            .ToListAsync();

        if (memories.Count == 0)
            return;

        long epochTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        // Filter memories that should be processed based on interval
        var memoriesToProcess = memories.Where(memory =>
        {
            if (!_lastExecutionTimes.TryGetValue(memory.Id, out var lastExecution))
            {
                return true; // First execution
            }
            return (epochTime - lastExecution) >= memory.Interval;
        }).ToList();

        if (memoriesToProcess.Count == 0)
            return;

        // Collect all unique input and output item IDs for batch fetching
        var allInputIds = new HashSet<string>();
        var allOutputIds = new HashSet<string>();

        foreach (var memory in memoriesToProcess)
        {
            allInputIds.Add(memory.InputItemId.ToString());
            allOutputIds.Add(memory.OutputItemId.ToString());
            if (memory.AlarmOutputItemId.HasValue)
            {
                allOutputIds.Add(memory.AlarmOutputItemId.Value.ToString());
            }
        }

        // Batch fetch all required Redis items (performance optimization)
        var inputItemsCache = await Points.GetFinalItemsBatch(allInputIds.ToList());
        var outputItemsCache = await Points.GetRawItemsBatch(allOutputIds.ToList());

        MyLog.Debug("Batch fetched Redis items for RateOfChange processing", new Dictionary<string, object?>
        {
            ["MemoryCount"] = memoriesToProcess.Count,
            ["InputItemsRequested"] = allInputIds.Count,
            ["InputItemsFetched"] = inputItemsCache.Count,
            ["OutputItemsRequested"] = allOutputIds.Count,
            ["OutputItemsFetched"] = outputItemsCache.Count
        });

        // Process each memory
        foreach (var memory in memoriesToProcess)
        {
            try
            {
                await ProcessSingleRateOfChange(memory, inputItemsCache, epochTime);
                _lastExecutionTimes[memory.Id] = epochTime;
            }
            catch (Exception ex)
            {
                MyLog.Error($"Failed to process RateOfChangeMemory {memory.Id}", ex, new Dictionary<string, object?>
                {
                    ["MemoryId"] = memory.Id,
                    ["MemoryName"] = memory.Name
                });
            }
        }
    }

    private async Task ProcessSingleRateOfChange(
        RateOfChangeMemory memory,
        Dictionary<string, FinalItemRedis> inputItemsCache,
        long epochTime)
    {
        var inputKey = memory.InputItemId.ToString();
        
        // Get input item from cache
        if (!inputItemsCache.TryGetValue(inputKey, out var inputItem))
        {
            MyLog.Warning("Input item not found in cache", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["InputItemId"] = memory.InputItemId
            });
            return;
        }

        // Parse current input value
        if (!double.TryParse(inputItem.Value, out double currentValue))
        {
            MyLog.Warning("Failed to parse input value for rate of change", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["InputValue"] = inputItem.Value
            });
            return;
        }

        bool shouldUpdateDatabase = false;

        // Add sample to history for windowed methods
        if (memory.CalculationMethod != RateCalculationMethod.SimpleDifference)
        {
            var sample = new RateOfChangeSample
            {
                RateOfChangeMemoryId = memory.Id,
                Timestamp = epochTime,
                Value = currentValue
            };
            _context!.RateOfChangeSamples.Add(sample);
            
            // Remove old samples outside the time window
            var cutoffTime = epochTime - memory.TimeWindowSeconds;
            var oldSamples = await _context.RateOfChangeSamples
                .Where(s => s.RateOfChangeMemoryId == memory.Id && s.Timestamp < cutoffTime)
                .ToListAsync();
            _context.RateOfChangeSamples.RemoveRange(oldSamples);
            
            shouldUpdateDatabase = true;
        }

        // Baseline establishment phase
        if (memory.AccumulatedSamples < memory.BaselineSampleCount)
        {
            memory.AccumulatedSamples++;
            memory.LastInputValue = currentValue;
            memory.LastTimestamp = epochTime;
            
            _context!.RateOfChangeMemories.Update(memory);
            await _context.SaveChangesAsync();
            
            MyLog.Debug("Rate of change baseline accumulating", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["AccumulatedSamples"] = memory.AccumulatedSamples,
                ["RequiredSamples"] = memory.BaselineSampleCount
            });
            return;
        }

        // Calculate rate based on selected method
        double? rawRate = null;
        
        switch (memory.CalculationMethod)
        {
            case RateCalculationMethod.SimpleDifference:
                rawRate = CalculateSimpleDifference(memory, currentValue, epochTime);
                break;
                
            case RateCalculationMethod.MovingAverage:
                rawRate = await CalculateMovingAverage(memory, epochTime);
                break;
                
            case RateCalculationMethod.WeightedAverage:
                rawRate = await CalculateWeightedAverage(memory, epochTime);
                break;
                
            case RateCalculationMethod.LinearRegression:
                rawRate = await CalculateLinearRegression(memory);
                break;
        }

        if (!rawRate.HasValue)
        {
            // Not enough data yet, just update last values
            memory.LastInputValue = currentValue;
            memory.LastTimestamp = epochTime;
            _context!.RateOfChangeMemories.Update(memory);
            await _context.SaveChangesAsync();
            return;
        }

        // Convert rate to target time unit
        // rawRate is in units/second, multiply by TimeUnit enum value to get target unit
        double convertedRate = rawRate.Value * (int)memory.TimeUnit;

        // Apply exponential smoothing filter
        double smoothedRate;
        if (memory.LastSmoothedRate.HasValue && memory.SmoothingFilterAlpha > 0)
        {
            // Exponential moving average: new = alpha * raw + (1 - alpha) * old
            // Note: Higher alpha = more smoothing (slower response)
            smoothedRate = memory.SmoothingFilterAlpha * memory.LastSmoothedRate.Value + 
                           (1 - memory.SmoothingFilterAlpha) * convertedRate;
        }
        else
        {
            smoothedRate = convertedRate;
        }

        // Round to configured decimal places
        smoothedRate = Math.Round(smoothedRate, memory.DecimalPlaces);

        // Update memory state
        memory.LastInputValue = currentValue;
        memory.LastTimestamp = epochTime;
        memory.LastSmoothedRate = smoothedRate;
        shouldUpdateDatabase = true;

        // Write rate to output
        var formattedValue = smoothedRate.ToString($"F{memory.DecimalPlaces}");
        await Points.WriteOrAddValue(memory.OutputItemId, formattedValue, epochTime);

        // Process alarm with hysteresis
        if (memory.AlarmOutputItemId.HasValue)
        {
            bool alarmActive = ProcessAlarmWithHysteresis(memory, smoothedRate);
            await Points.WriteOrAddValue(memory.AlarmOutputItemId.Value, alarmActive ? "1" : "0", epochTime);
        }

        // Persist state to database
        if (shouldUpdateDatabase)
        {
            _context!.RateOfChangeMemories.Update(memory);
            await _context.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Simple difference calculation: (current - last) / deltaTime
    /// </summary>
    private double? CalculateSimpleDifference(RateOfChangeMemory memory, double currentValue, long epochTime)
    {
        if (!memory.LastInputValue.HasValue || !memory.LastTimestamp.HasValue)
        {
            return null;
        }

        long deltaTime = epochTime - memory.LastTimestamp.Value;
        if (deltaTime <= 0)
        {
            return null;
        }

        double deltaValue = currentValue - memory.LastInputValue.Value;
        return deltaValue / deltaTime; // Rate in units/second
    }

    /// <summary>
    /// Moving average of point-to-point derivatives
    /// </summary>
    private async Task<double?> CalculateMovingAverage(RateOfChangeMemory memory, long epochTime)
    {
        var samples = await _context!.RateOfChangeSamples
            .Where(s => s.RateOfChangeMemoryId == memory.Id)
            .OrderBy(s => s.Timestamp)
            .ToListAsync();

        if (samples.Count < 2)
        {
            return null;
        }

        // Calculate point-to-point derivatives and average them
        var derivatives = new List<double>();
        for (int i = 1; i < samples.Count; i++)
        {
            long dt = samples[i].Timestamp - samples[i - 1].Timestamp;
            if (dt > 0)
            {
                double dv = samples[i].Value - samples[i - 1].Value;
                derivatives.Add(dv / dt);
            }
        }

        if (derivatives.Count == 0)
        {
            return null;
        }

        return derivatives.Average();
    }

    /// <summary>
    /// Weighted average with exponential decay (recent samples weighted higher)
    /// </summary>
    private async Task<double?> CalculateWeightedAverage(RateOfChangeMemory memory, long epochTime)
    {
        var samples = await _context!.RateOfChangeSamples
            .Where(s => s.RateOfChangeMemoryId == memory.Id)
            .OrderBy(s => s.Timestamp)
            .ToListAsync();

        if (samples.Count < 2)
        {
            return null;
        }

        // Calculate point-to-point derivatives with exponential weights
        double weightSum = 0;
        double weightedSum = 0;
        double decayFactor = 0.1; // Weight decay per sample (older = less weight)

        for (int i = 1; i < samples.Count; i++)
        {
            long dt = samples[i].Timestamp - samples[i - 1].Timestamp;
            if (dt > 0)
            {
                double dv = samples[i].Value - samples[i - 1].Value;
                double derivative = dv / dt;
                
                // Weight increases exponentially for recent samples
                double weight = Math.Exp(decayFactor * (i - samples.Count + 1));
                weightedSum += derivative * weight;
                weightSum += weight;
            }
        }

        if (weightSum == 0)
        {
            return null;
        }

        return weightedSum / weightSum;
    }

    /// <summary>
    /// Linear regression (least-squares fit) to find slope
    /// Best for noisy data, requires minimum 5 samples
    /// </summary>
    private async Task<double?> CalculateLinearRegression(RateOfChangeMemory memory)
    {
        var samples = await _context!.RateOfChangeSamples
            .Where(s => s.RateOfChangeMemoryId == memory.Id)
            .OrderBy(s => s.Timestamp)
            .ToListAsync();

        if (samples.Count < 5)
        {
            MyLog.Debug("Insufficient samples for linear regression", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["SampleCount"] = samples.Count,
                ["Required"] = 5
            });
            return null;
        }

        // Linear regression: y = mx + b
        // m = (n*Σxy - Σx*Σy) / (n*Σx² - (Σx)²)
        int n = samples.Count;
        
        // Use relative timestamps for numerical stability
        long baseTime = samples[0].Timestamp;
        
        double sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        foreach (var sample in samples)
        {
            double x = sample.Timestamp - baseTime; // Relative time in seconds
            double y = sample.Value;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
        }

        double denominator = n * sumX2 - sumX * sumX;
        if (Math.Abs(denominator) < 1e-10)
        {
            // All samples at same time or perfect linear (unlikely)
            return null;
        }

        double slope = (n * sumXY - sumX * sumY) / denominator;
        return slope; // Rate in units/second
    }

    /// <summary>
    /// Process alarm with hysteresis for auto-clearing
    /// Returns true if alarm should be active
    /// </summary>
    private bool ProcessAlarmWithHysteresis(RateOfChangeMemory memory, double currentRate)
    {
        bool highAlarm = false;
        bool lowAlarm = false;

        // Check high rate threshold
        if (memory.HighRateThreshold.HasValue)
        {
            if (memory.AlarmState == true)
            {
                // Already in high alarm state - check hysteresis for clearing
                // Clear when rate drops below threshold * hysteresis
                double clearThreshold = memory.HighRateThreshold.Value * memory.HighRateHysteresis;
                highAlarm = currentRate >= clearThreshold;
            }
            else
            {
                // Not in high alarm - check if rate exceeds threshold
                highAlarm = currentRate > memory.HighRateThreshold.Value;
            }
        }

        // Check low rate threshold
        if (memory.LowRateThreshold.HasValue)
        {
            if (memory.AlarmState == false)
            {
                // Already in low alarm state - check hysteresis for clearing
                // Clear when rate rises above threshold / hysteresis
                double clearThreshold = memory.LowRateThreshold.Value / memory.LowRateHysteresis;
                lowAlarm = currentRate <= clearThreshold;
            }
            else
            {
                // Not in low alarm - check if rate drops below threshold
                lowAlarm = currentRate < memory.LowRateThreshold.Value;
            }
        }

        // Determine alarm state
        // Priority: high alarm (true) > low alarm (false) > no alarm (null)
        if (highAlarm)
        {
            memory.AlarmState = true;
            return true;
        }
        else if (lowAlarm)
        {
            memory.AlarmState = false;
            return true;
        }
        else
        {
            memory.AlarmState = null;
            return false;
        }
    }
}
