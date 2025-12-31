using System.Text.Json;
using Core.Libs;
using Core.Models;
using Core.RedisModels;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Processes Average Memory / Moving Average / Filter Memory configurations.
/// Supports multiple modes:
/// - Multi-input averaging (original behavior): Average multiple input items at a point in time
/// - Time-based moving average: Apply SMA/EMA/WMA to a single input over time window
/// 
/// Use Cases:
/// - Noise reduction on analog signals
/// - Trend smoothing for displays
/// - Dampen oscillations in control systems
/// - Signal conditioning before processing
/// </summary>
public class AverageMemoryProcess
{
    // Singleton instance
    private static AverageMemoryProcess? _instance;
    private static readonly object _lock = new object();
    private static Task? _runTask;

    private DataContext? _context;

    // Track last execution time for each memory to respect interval
    private readonly Dictionary<Guid, long> _lastExecutionTimes = new();
    
    // In-memory EMA state for fast processing (persisted to DB on significant changes)
    private readonly Dictionary<Guid, double> _emaState = new();

    // Private constructor to enforce Singleton
    private AverageMemoryProcess()
    {
        _context = null;
    }

    // Singleton instance access
    public static AverageMemoryProcess Instance
    {
        get
        {
            lock (_lock) // Ensure thread-safe access to the instance
            {
                if (_instance == null)
                {
                    _instance = new AverageMemoryProcess();
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
                                await CleanupOldSamples();
                            }
                        }
                        catch (Exception ex2)
                        {
                            MyLog.LogJson(ex2);
                        }
                        finally
                        {
                            await Task.Delay(1000); // Delay to prevent rapid loops
                        }
                    }
                });
            }
        }

        await _runTask; // Await the task if it has already started
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
                MyLog.LogJson("AverageMemoryProcess", "Database connection established");
                return;
            }
            catch (Exception ex)
            {
                MyLog.LogJson("AverageMemoryProcess", $"Waiting for database connection... Attempt {i + 1}/{maxRetries}");
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
        var memories = await _context!.AverageMemories
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
            try
            {
                var inputIds = JsonSerializer.Deserialize<List<string>>(memory.InputItemIds);
                if (inputIds != null)
                {
                    foreach (var id in inputIds)
                    {
                        allInputIds.Add(id);
                    }
                }
                allOutputIds.Add(memory.OutputItemId.ToString());
            }
            catch (Exception ex)
            {
                MyLog.LogJson($"Failed to parse InputItemIds for AverageMemory {memory.Id}", ex);
            }
        }

        // Batch fetch all required Redis items (performance optimization)
        var inputItemsCache = await Points.GetFinalItemsBatch(allInputIds.ToList());
        var outputItemsCache = await Points.GetRawItemsBatch(allOutputIds.ToList());

        MyLog.Debug("Batch fetched Redis items for Average processing", new Dictionary<string, object?>
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
                await ProcessSingleMemory(memory, inputItemsCache, outputItemsCache, epochTime);
                _lastExecutionTimes[memory.Id] = epochTime;
            }
            catch (Exception ex)
            {
                MyLog.LogJson($"Failed to process AverageMemory {memory.Id}", ex);
            }
        }
    }

    private async Task ProcessSingleMemory(
        AverageMemory memory,
        Dictionary<string, FinalItemRedis> inputItemsCache,
        Dictionary<string, RawItemRedis> outputItemsCache,
        long currentEpochTime)
    {
        // Parse input item IDs
        List<string> inputIdStrings;
        try
        {
            inputIdStrings = JsonSerializer.Deserialize<List<string>>(memory.InputItemIds) ?? new List<string>();
        }
        catch (Exception ex)
        {
            MyLog.LogJson($"Failed to parse InputItemIds for AverageMemory {memory.Id}", ex);
            return;
        }

        if (inputIdStrings.Count == 0)
            return;

        // Determine processing mode based on input count and average type
        // - Single input: Time-based moving average (SMA/EMA/WMA over time window)
        // - Multiple inputs: Multi-input averaging at a point in time
        
        if (inputIdStrings.Count == 1)
        {
            // Time-based moving average mode (filter memory)
            await ProcessMovingAverage(memory, inputIdStrings[0], inputItemsCache, currentEpochTime);
        }
        else
        {
            // Multi-input averaging mode (original behavior)
            await ProcessMultiInputAverage(memory, inputIdStrings, inputItemsCache, currentEpochTime);
        }
    }

    /// <summary>
    /// Process time-based moving average for a single input (signal filtering).
    /// Stores samples in history and applies SMA/EMA/WMA algorithms.
    /// </summary>
    private async Task ProcessMovingAverage(
        AverageMemory memory,
        string inputId,
        Dictionary<string, FinalItemRedis> inputItemsCache,
        long currentEpochTime)
    {
        // Get current input value
        if (!inputItemsCache.TryGetValue(inputId, out var inputItem))
        {
            MyLog.Debug($"AverageMemory {memory.Id}: Input item {inputId} not found in cache");
            return;
        }

        // Check if input is stale
        if (memory.IgnoreStale && (currentEpochTime - inputItem.Time) > memory.StaleTimeout)
        {
            MyLog.Debug($"AverageMemory {memory.Id}: Input is stale (age: {currentEpochTime - inputItem.Time}s > {memory.StaleTimeout}s)");
            return;
        }

        // Parse input value
        if (!double.TryParse(inputItem.Value, out var currentValue))
        {
            MyLog.Debug($"AverageMemory {memory.Id}: Cannot parse input value '{inputItem.Value}' as double");
            return;
        }

        double result;
        
        switch (memory.AverageType)
        {
            case MovingAverageType.Exponential:
                result = await ProcessEMA(memory, currentValue, currentEpochTime);
                break;
                
            case MovingAverageType.Weighted:
                result = await ProcessWMA(memory, currentValue, currentEpochTime);
                break;
                
            case MovingAverageType.Simple:
            default:
                result = await ProcessSMA(memory, currentValue, currentEpochTime);
                break;
        }

        // Write to output
        await Points.WriteOrAddValue(memory.OutputItemId, result.ToString("F4"), currentEpochTime);

        MyLog.Debug($"AverageMemory {memory.Id}: {memory.AverageType} = {result:F4} (input: {currentValue:F4})");
    }

    /// <summary>
    /// Simple Moving Average (SMA): Equal weight to all samples in window.
    /// SMA = (x1 + x2 + ... + xn) / n
    /// </summary>
    private async Task<double> ProcessSMA(AverageMemory memory, double currentValue, long timestamp)
    {
        // Add current sample to history
        await AddSampleToHistory(memory.Id, currentValue, timestamp);

        // Get samples within window
        var samples = await GetRecentSamples(memory.Id, memory.WindowSize);
        
        if (samples.Count == 0)
            return currentValue;

        // Apply outlier detection if enabled
        var values = samples.Select(s => s.Value).ToList();
        if (memory.EnableOutlierDetection && values.Count >= 3)
        {
            var nonOutlierIndices = DetectOutliers(values, memory.OutlierMethod, memory.OutlierThreshold);
            values = nonOutlierIndices.Select(i => values[i]).ToList();
        }

        if (values.Count < memory.MinimumInputs)
            return currentValue; // Not enough valid samples

        // Simple average
        return values.Average();
    }

    /// <summary>
    /// Exponential Moving Average (EMA): Exponential decay weighting.
    /// EMA = α × current_value + (1 - α) × previous_EMA
    /// </summary>
    private async Task<double> ProcessEMA(AverageMemory memory, double currentValue, long timestamp)
    {
        // Check for stale input
        if (memory.IgnoreStale && timestamp - (await GetLastSampleTimestamp(memory.Id)) > memory.StaleTimeout)
        {
            // Reset EMA if input was stale
            _emaState.Remove(memory.Id);
        }

        // Get previous EMA or initialize with current value
        if (!_emaState.TryGetValue(memory.Id, out var previousEma))
        {
            // Try to load from last sample
            var lastSample = (await GetRecentSamples(memory.Id, 1)).FirstOrDefault();
            if (lastSample != null)
            {
                previousEma = lastSample.Value;
            }
            else
            {
                previousEma = currentValue; // First sample, EMA = current value
            }
        }

        // Calculate EMA: α × current + (1 - α) × previous
        double alpha = Math.Clamp(memory.Alpha, 0.01, 1.0);
        double ema = alpha * currentValue + (1.0 - alpha) * previousEma;

        // Store EMA state
        _emaState[memory.Id] = ema;

        // Store sample for history (used for recovery after restart)
        await AddSampleToHistory(memory.Id, ema, timestamp);

        return ema;
    }

    /// <summary>
    /// Weighted Moving Average (WMA): Linear or custom weights.
    /// Most recent samples have higher weight when using linear weights.
    /// </summary>
    private async Task<double> ProcessWMA(AverageMemory memory, double currentValue, long timestamp)
    {
        // Add current sample to history
        await AddSampleToHistory(memory.Id, currentValue, timestamp);

        // Get samples within window
        var samples = await GetRecentSamples(memory.Id, memory.WindowSize);
        
        if (samples.Count == 0)
            return currentValue;

        // Apply outlier detection if enabled
        var values = samples.Select(s => s.Value).ToList();
        if (memory.EnableOutlierDetection && values.Count >= 3)
        {
            var nonOutlierIndices = DetectOutliers(values, memory.OutlierMethod, memory.OutlierThreshold);
            values = nonOutlierIndices.Select(i => values[i]).ToList();
        }

        if (values.Count < memory.MinimumInputs)
            return currentValue; // Not enough valid samples

        // Generate weights
        List<double> weights;
        if (memory.UseLinearWeights)
        {
            // Linear weights: [1, 2, 3, 4, 5] for window_size=5
            // Most recent (last in list) has highest weight
            weights = Enumerable.Range(1, values.Count).Select(i => (double)i).ToList();
        }
        else
        {
            // Use custom weights from configuration (or equal if not configured)
            weights = ParseWeights(memory.Weights, values.Count);
        }

        // Calculate weighted average
        double weightedSum = 0;
        double totalWeight = 0;
        for (int i = 0; i < values.Count; i++)
        {
            double w = i < weights.Count ? weights[i] : 1.0;
            weightedSum += values[i] * w;
            totalWeight += w;
        }

        return totalWeight > 0 ? weightedSum / totalWeight : currentValue;
    }

    /// <summary>
    /// Process multi-input averaging at a point in time (original behavior).
    /// Averages multiple input items together with optional weighting and outlier detection.
    /// </summary>
    private async Task ProcessMultiInputAverage(
        AverageMemory memory,
        List<string> inputIdStrings,
        Dictionary<string, FinalItemRedis> inputItemsCache,
        long currentEpochTime)
    {
        // Parse weights if provided
        List<double>? weights = null;
        if (!string.IsNullOrWhiteSpace(memory.Weights))
        {
            try
            {
                weights = JsonSerializer.Deserialize<List<double>>(memory.Weights);
                if (weights != null && weights.Count != inputIdStrings.Count)
                {
                    MyLog.LogJson($"Weights count mismatch for AverageMemory {memory.Id}. Using equal weights.");
                    weights = null; // Fall back to equal weights
                }
            }
            catch (Exception ex)
            {
                MyLog.LogJson($"Failed to parse Weights for AverageMemory {memory.Id}", ex);
                weights = null; // Fall back to equal weights
            }
        }

        // Collect valid input values
        var validInputs = new List<(double Value, double Weight)>();

        for (int i = 0; i < inputIdStrings.Count; i++)
        {
            var inputId = inputIdStrings[i];
            if (!inputItemsCache.TryGetValue(inputId, out var inputItem))
            {
                continue; // Input item not found in cache
            }

            // Check if input is stale
            if (memory.IgnoreStale && (currentEpochTime - inputItem.Time) > memory.StaleTimeout)
            {
                continue; // Skip stale input
            }

            // Parse input value
            if (!double.TryParse(inputItem.Value, out var value))
            {
                continue; // Skip non-numeric values
            }

            // Get weight for this input
            double weight = weights != null && i < weights.Count ? weights[i] : 1.0;

            validInputs.Add((value, weight));
        }

        // Check if we have enough valid inputs
        if (validInputs.Count < memory.MinimumInputs)
        {
            MyLog.Debug($"AverageMemory {memory.Id}: Not enough valid inputs ({validInputs.Count}/{memory.MinimumInputs})");
            return; // Don't update output
        }

        // Extract values for outlier detection
        var values = validInputs.Select(x => x.Value).ToList();

        // Apply outlier detection if enabled
        List<(double Value, double Weight)> filteredInputs;
        if (memory.EnableOutlierDetection && validInputs.Count >= 3) // Need at least 3 points for outlier detection
        {
            var nonOutlierIndices = DetectOutliers(values, memory.OutlierMethod, memory.OutlierThreshold);
            filteredInputs = nonOutlierIndices.Select(idx => validInputs[idx]).ToList();
            
            if (filteredInputs.Count < memory.MinimumInputs)
            {
                MyLog.Debug($"AverageMemory {memory.Id}: Not enough inputs after outlier removal ({filteredInputs.Count}/{memory.MinimumInputs})");
                return; // Don't update output
            }
        }
        else
        {
            filteredInputs = validInputs;
        }

        // Calculate weighted average
        double weightedSum = 0;
        double totalWeight = 0;

        foreach (var (value, weight) in filteredInputs)
        {
            weightedSum += value * weight;
            totalWeight += weight;
        }

        if (totalWeight == 0)
        {
            MyLog.Debug($"AverageMemory {memory.Id}: Total weight is zero");
            return;
        }

        double average = weightedSum / totalWeight;

        // Write to output
        await Points.WriteOrAddValue(memory.OutputItemId, average.ToString("F4"), currentEpochTime);

        MyLog.Debug($"AverageMemory {memory.Id}: Computed average = {average:F4} from {filteredInputs.Count} inputs");
    }

    // ==================== Sample History Management ====================

    /// <summary>
    /// Add a sample to history for a given memory
    /// </summary>
    private async Task AddSampleToHistory(Guid memoryId, double value, long timestamp)
    {
        var sample = new AverageMemorySample
        {
            AverageMemoryId = memoryId,
            Value = value,
            Timestamp = timestamp
        };
        
        _context!.AverageMemorySamples.Add(sample);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Get recent samples for a memory, ordered by timestamp descending
    /// </summary>
    private async Task<List<AverageMemorySample>> GetRecentSamples(Guid memoryId, int count)
    {
        return await _context!.AverageMemorySamples
            .Where(s => s.AverageMemoryId == memoryId)
            .OrderByDescending(s => s.Timestamp)
            .Take(count)
            .OrderBy(s => s.Timestamp) // Return in chronological order for weighted average
            .ToListAsync();
    }

    /// <summary>
    /// Get the timestamp of the last sample for a memory
    /// </summary>
    private async Task<long> GetLastSampleTimestamp(Guid memoryId)
    {
        var lastSample = await _context!.AverageMemorySamples
            .Where(s => s.AverageMemoryId == memoryId)
            .OrderByDescending(s => s.Timestamp)
            .FirstOrDefaultAsync();
        
        return lastSample?.Timestamp ?? 0;
    }

    /// <summary>
    /// Cleanup old samples beyond the maximum window size
    /// Called periodically to prevent unbounded growth
    /// </summary>
    private async Task CleanupOldSamples()
    {
        try
        {
            // Get all memories with their max window sizes
            var memories = await _context!.AverageMemories
                .Where(m => !m.IsDisabled)
                .Select(m => new { m.Id, m.WindowSize })
                .ToListAsync();

            foreach (var memory in memories)
            {
                // Keep samples up to 2x window size for safety
                int maxSamplesToKeep = memory.WindowSize * 2;

                // Get sample count for this memory
                var sampleCount = await _context.AverageMemorySamples
                    .Where(s => s.AverageMemoryId == memory.Id)
                    .CountAsync();

                if (sampleCount <= maxSamplesToKeep)
                    continue;

                // Find the cutoff timestamp
                var cutoffSample = await _context.AverageMemorySamples
                    .Where(s => s.AverageMemoryId == memory.Id)
                    .OrderByDescending(s => s.Timestamp)
                    .Skip(maxSamplesToKeep)
                    .FirstOrDefaultAsync();

                if (cutoffSample != null)
                {
                    // Delete samples older than cutoff
                    var samplesToDelete = await _context.AverageMemorySamples
                        .Where(s => s.AverageMemoryId == memory.Id && s.Timestamp <= cutoffSample.Timestamp)
                        .ToListAsync();

                    if (samplesToDelete.Count > 0)
                    {
                        _context.AverageMemorySamples.RemoveRange(samplesToDelete);
                        await _context.SaveChangesAsync();
                        MyLog.Debug($"AverageMemory {memory.Id}: Cleaned up {samplesToDelete.Count} old samples");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            MyLog.LogJson("Failed to cleanup old average memory samples", ex);
        }
    }

    /// <summary>
    /// Parse weights from JSON string or return equal weights
    /// </summary>
    private List<double> ParseWeights(string? weightsJson, int count)
    {
        if (string.IsNullOrWhiteSpace(weightsJson))
        {
            return Enumerable.Repeat(1.0, count).ToList();
        }

        try
        {
            var weights = JsonSerializer.Deserialize<List<double>>(weightsJson);
            if (weights != null && weights.Count > 0)
            {
                // Pad or truncate to match count
                while (weights.Count < count)
                    weights.Add(1.0);
                return weights.Take(count).ToList();
            }
        }
        catch { }

        return Enumerable.Repeat(1.0, count).ToList();
    }

    // ==================== Outlier Detection ====================
    
    /// <summary>
    /// Detects outliers in a dataset and returns indices of non-outlier values
    /// </summary>
    /// <param name="values">Input values to analyze</param>
    /// <param name="method">Outlier detection method (IQR or ZScore)</param>
    /// <param name="threshold">Threshold value (1.5 for IQR, 3.0 for ZScore typically)</param>
    /// <returns>List of indices for non-outlier values</returns>
    private List<int> DetectOutliers(List<double> values, OutlierMethod method, double threshold)
    {
        if (values.Count < 3)
        {
            // Not enough data for outlier detection, return all indices
            return Enumerable.Range(0, values.Count).ToList();
        }

        switch (method)
        {
            case OutlierMethod.IQR:
                return DetectOutliersIQR(values, threshold);
            
            case OutlierMethod.ZScore:
                return DetectOutliersZScore(values, threshold);
            
            case OutlierMethod.None:
            default:
                return Enumerable.Range(0, values.Count).ToList();
        }
    }
    
    /// <summary>
    /// IQR (Interquartile Range) method for outlier detection
    /// Removes values outside [Q1 - k*IQR, Q3 + k*IQR] where k is the threshold (typically 1.5)
    /// </summary>
    private List<int> DetectOutliersIQR(List<double> values, double k)
    {
        var sorted = values.OrderBy(x => x).ToList();
        int n = sorted.Count;

        // Calculate Q1 (25th percentile) and Q3 (75th percentile)
        double q1 = Percentile(sorted, 25);
        double q3 = Percentile(sorted, 75);
        double iqr = q3 - q1;

        // Calculate bounds
        double lowerBound = q1 - k * iqr;
        double upperBound = q3 + k * iqr;

        // Return indices of non-outliers
        var nonOutlierIndices = new List<int>();
        for (int i = 0; i < values.Count; i++)
        {
            if (values[i] >= lowerBound && values[i] <= upperBound)
            {
                nonOutlierIndices.Add(i);
            }
        }

        return nonOutlierIndices;
    }

    /// <summary>
    /// Z-Score method for outlier detection
    /// Removes values with |z-score| > threshold (typically 3.0)
    /// Assumes data follows normal distribution
    /// </summary>
    private List<int> DetectOutliersZScore(List<double> values, double threshold)
    {
        double mean = values.Average();
        double variance = values.Sum(x => Math.Pow(x - mean, 2)) / values.Count;
        double stdDev = Math.Sqrt(variance);

        if (stdDev == 0)
        {
            // All values are identical, no outliers
            return Enumerable.Range(0, values.Count).ToList();
        }

        // Calculate z-scores and filter
        var nonOutlierIndices = new List<int>();
        for (int i = 0; i < values.Count; i++)
        {
            double zScore = Math.Abs((values[i] - mean) / stdDev);
            if (zScore <= threshold)
            {
                nonOutlierIndices.Add(i);
            }
        }

        return nonOutlierIndices;
    }

    /// <summary>
    /// Calculates percentile value from sorted list
    /// </summary>
    private double Percentile(List<double> sortedValues, double percentile)
    {
        int n = sortedValues.Count;
        double position = percentile / 100.0 * (n - 1);
        int lowerIndex = (int)Math.Floor(position);
        int upperIndex = (int)Math.Ceiling(position);

        if (lowerIndex == upperIndex)
        {
            return sortedValues[lowerIndex];
        }

        double lowerValue = sortedValues[lowerIndex];
        double upperValue = sortedValues[upperIndex];
        double fraction = position - lowerIndex;

        return lowerValue + fraction * (upperValue - lowerValue);
    }
}
