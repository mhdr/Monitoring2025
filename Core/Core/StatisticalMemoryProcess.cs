using System.Text.Json;
using Core.Libs;
using Core.Models;
using Core.RedisModels;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Process for calculating statistical metrics (min, max, avg, stddev, range, median, percentiles, CV)
/// over configurable rolling or tumbling time windows.
/// </summary>
public class StatisticalMemoryProcess
{
    // Singleton instance
    private static StatisticalMemoryProcess? _instance;
    private static readonly object _lock = new object();
    private static Task? _runTask;

    private DataContext? _context;

    // Track last execution time for each memory to respect interval
    private readonly Dictionary<Guid, long> _lastExecutionTimes = new();

    // Private constructor to enforce Singleton
    private StatisticalMemoryProcess()
    {
        _context = null;
    }

    // Singleton instance access
    public static StatisticalMemoryProcess Instance
    {
        get
        {
            lock (_lock)
            {
                if (_instance == null)
                {
                    _instance = new StatisticalMemoryProcess();
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

                    // Start cleanup task in background
                    _ = Task.Run(RunCleanupTask);
                    
                    while (true)
                    {
                        try
                        {
                            await using (_context = new DataContext())
                            {
                                await Process();
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

        await _runTask;
    }

    /// <summary>
    /// Background cleanup task that runs every hour to remove old samples
    /// beyond WindowSize * 1.2 buffer for each memory
    /// </summary>
    private async Task RunCleanupTask()
    {
        // Wait 5 minutes before first cleanup to allow system to stabilize
        await Task.Delay(TimeSpan.FromMinutes(5));

        while (true)
        {
            try
            {
                await using var cleanupContext = new DataContext();
                await CleanupOldSamples(cleanupContext);
            }
            catch (Exception ex)
            {
                MyLog.LogJson("StatisticalMemoryProcess.Cleanup", ex);
            }

            // Run cleanup every hour
            await Task.Delay(TimeSpan.FromHours(1));
        }
    }

    /// <summary>
    /// Remove samples older than WindowSize * 1.2 for each memory
    /// Uses database queries to efficiently delete old data
    /// </summary>
    private async Task CleanupOldSamples(DataContext context)
    {
        var memories = await context.StatisticalMemories.ToListAsync();
        int totalRemoved = 0;

        foreach (var memory in memories)
        {
            try
            {
                // Calculate max samples to keep (WindowSize * 1.2 for buffer)
                int maxSamplesToKeep = (int)(memory.WindowSize * 1.2);

                // Get the count of samples for this memory
                int sampleCount = await context.StatisticalMemorySamples
                    .Where(s => s.StatisticalMemoryId == memory.Id)
                    .CountAsync();

                if (sampleCount <= maxSamplesToKeep)
                    continue;

                // Find the cutoff timestamp (keep the most recent maxSamplesToKeep samples)
                var cutoffSample = await context.StatisticalMemorySamples
                    .Where(s => s.StatisticalMemoryId == memory.Id)
                    .OrderByDescending(s => s.Timestamp)
                    .Skip(maxSamplesToKeep)
                    .FirstOrDefaultAsync();

                if (cutoffSample == null)
                    continue;

                // Delete samples older than cutoff
                var samplesToRemove = await context.StatisticalMemorySamples
                    .Where(s => s.StatisticalMemoryId == memory.Id && s.Timestamp <= cutoffSample.Timestamp)
                    .ToListAsync();

                if (samplesToRemove.Count > 0)
                {
                    context.StatisticalMemorySamples.RemoveRange(samplesToRemove);
                    await context.SaveChangesAsync();
                    totalRemoved += samplesToRemove.Count;
                }
            }
            catch (Exception ex)
            {
                MyLog.LogJson($"StatisticalMemoryProcess.Cleanup: Error cleaning memory {memory.Id}", ex);
            }
        }

        if (totalRemoved > 0)
        {
            MyLog.LogJson("StatisticalMemoryProcess.Cleanup", $"Removed {totalRemoved} old samples from {memories.Count} memories");
        }
    }

    private async Task WaitForDatabaseConnection()
    {
        int maxRetries = 30;
        int retryDelay = 2000;

        for (int i = 0; i < maxRetries; i++)
        {
            try
            {
                using var testContext = new DataContext();
                await testContext.Database.CanConnectAsync();
                MyLog.LogJson("StatisticalMemoryProcess", "Database connection established");
                return;
            }
            catch (Exception ex)
            {
                MyLog.LogJson("StatisticalMemoryProcess", $"Waiting for database connection... Attempt {i + 1}/{maxRetries}");
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
        var memories = await _context!.StatisticalMemories
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
            
            // Add all configured outputs
            if (memory.OutputMinItemId.HasValue)
                allOutputIds.Add(memory.OutputMinItemId.Value.ToString());
            if (memory.OutputMaxItemId.HasValue)
                allOutputIds.Add(memory.OutputMaxItemId.Value.ToString());
            if (memory.OutputAvgItemId.HasValue)
                allOutputIds.Add(memory.OutputAvgItemId.Value.ToString());
            if (memory.OutputStdDevItemId.HasValue)
                allOutputIds.Add(memory.OutputStdDevItemId.Value.ToString());
            if (memory.OutputRangeItemId.HasValue)
                allOutputIds.Add(memory.OutputRangeItemId.Value.ToString());
            if (memory.OutputMedianItemId.HasValue)
                allOutputIds.Add(memory.OutputMedianItemId.Value.ToString());
            if (memory.OutputCVItemId.HasValue)
                allOutputIds.Add(memory.OutputCVItemId.Value.ToString());

            // Add percentile outputs
            try
            {
                var percentiles = JsonSerializer.Deserialize<List<PercentileConfig>>(memory.PercentilesConfig);
                if (percentiles != null)
                {
                    foreach (var p in percentiles)
                    {
                        allOutputIds.Add(p.OutputItemId.ToString());
                    }
                }
            }
            catch { /* Ignore parse errors */ }
        }

        // Batch fetch all required Redis items
        var inputItemsCache = await Points.GetFinalItemsBatch(allInputIds.ToList());
        var outputItemsCache = await Points.GetRawItemsBatch(allOutputIds.ToList());

        MyLog.Debug("Batch fetched Redis items for Statistical processing", new Dictionary<string, object?>
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
                MyLog.LogJson($"Failed to process StatisticalMemory {memory.Id}", ex);
            }
        }
    }

    private async Task ProcessSingleMemory(
        StatisticalMemory memory,
        Dictionary<string, FinalItemRedis> inputItemsCache,
        Dictionary<string, RawItemRedis> outputItemsCache,
        long currentEpochTime)
    {
        var inputId = memory.InputItemId.ToString();
        
        // Get current input value
        if (!inputItemsCache.TryGetValue(inputId, out var inputItem))
        {
            MyLog.Debug($"StatisticalMemory {memory.Id}: Input item not found in cache");
            return;
        }

        if (!double.TryParse(inputItem.Value, out var currentValue))
        {
            MyLog.Debug($"StatisticalMemory {memory.Id}: Failed to parse input value: {inputItem.Value}");
            return;
        }

        // Add new sample to database
        var newSample = new StatisticalMemorySample
        {
            StatisticalMemoryId = memory.Id,
            Timestamp = currentEpochTime,
            Value = currentValue
        };
        _context!.StatisticalMemorySamples.Add(newSample);

        // Update batch count for tumbling window
        memory.CurrentBatchCount++;

        // Get samples for calculation (based on window type)
        List<double> values;
        bool shouldReset = false;

        if (memory.WindowType == StatisticalWindowType.Tumbling)
        {
            // Tumbling window: use all samples since last reset
            var samples = await _context.StatisticalMemorySamples
                .Where(s => s.StatisticalMemoryId == memory.Id)
                .OrderByDescending(s => s.Timestamp)
                .Take(memory.WindowSize)
                .ToListAsync();
            
            values = samples.Select(s => s.Value).ToList();
            
            // Check if window is full for tumbling mode
            if (memory.CurrentBatchCount >= memory.WindowSize)
            {
                shouldReset = true;
            }
        }
        else
        {
            // Rolling window: always use latest WindowSize samples
            var samples = await _context.StatisticalMemorySamples
                .Where(s => s.StatisticalMemoryId == memory.Id)
                .OrderByDescending(s => s.Timestamp)
                .Take(memory.WindowSize)
                .ToListAsync();
            
            values = samples.Select(s => s.Value).ToList();
        }

        // Check if we have minimum samples required
        if (values.Count < memory.MinSamples)
        {
            MyLog.Debug($"StatisticalMemory {memory.Id}: Not enough samples ({values.Count}/{memory.MinSamples})");
            await _context.SaveChangesAsync();
            return;
        }

        // Calculate statistics
        var stats = CalculateStatistics(values);

        // Parse percentiles config
        List<PercentileConfig>? percentiles = null;
        try
        {
            percentiles = JsonSerializer.Deserialize<List<PercentileConfig>>(memory.PercentilesConfig);
        }
        catch { /* Ignore parse errors */ }

        // Write outputs to Redis
        await WriteOutputs(memory, stats, percentiles, values, currentEpochTime);

        // Handle tumbling window reset
        if (shouldReset && memory.WindowType == StatisticalWindowType.Tumbling)
        {
            // Clear all samples for this memory
            var samplesToRemove = await _context.StatisticalMemorySamples
                .Where(s => s.StatisticalMemoryId == memory.Id)
                .ToListAsync();
            _context.StatisticalMemorySamples.RemoveRange(samplesToRemove);
            
            memory.CurrentBatchCount = 0;
            memory.LastResetTime = currentEpochTime;
            
            MyLog.Debug($"StatisticalMemory {memory.Id}: Tumbling window reset after {samplesToRemove.Count} samples");
        }

        _context.StatisticalMemories.Update(memory);
        await _context.SaveChangesAsync();
    }

    private async Task WriteOutputs(
        StatisticalMemory memory,
        StatisticsResult stats,
        List<PercentileConfig>? percentiles,
        List<double> sortedValues,
        long epochTime)
    {
        // Write core outputs (only if configured)
        if (memory.OutputMinItemId.HasValue)
        {
            await Points.WriteOrAddValue(
                memory.OutputMinItemId.Value,
                stats.Min.ToString("F4"),
                null,
                memory.Duration);
        }

        if (memory.OutputMaxItemId.HasValue)
        {
            await Points.WriteOrAddValue(
                memory.OutputMaxItemId.Value,
                stats.Max.ToString("F4"),
                null,
                memory.Duration);
        }

        if (memory.OutputAvgItemId.HasValue)
        {
            await Points.WriteOrAddValue(
                memory.OutputAvgItemId.Value,
                stats.Average.ToString("F4"),
                null,
                memory.Duration);
        }

        if (memory.OutputStdDevItemId.HasValue)
        {
            await Points.WriteOrAddValue(
                memory.OutputStdDevItemId.Value,
                stats.StdDev.ToString("F4"),
                null,
                memory.Duration);
        }

        if (memory.OutputRangeItemId.HasValue)
        {
            await Points.WriteOrAddValue(
                memory.OutputRangeItemId.Value,
                stats.Range.ToString("F4"),
                null,
                memory.Duration);
        }

        if (memory.OutputMedianItemId.HasValue)
        {
            await Points.WriteOrAddValue(
                memory.OutputMedianItemId.Value,
                stats.Median.ToString("F4"),
                null,
                memory.Duration);
        }

        if (memory.OutputCVItemId.HasValue)
        {
            await Points.WriteOrAddValue(
                memory.OutputCVItemId.Value,
                stats.CoefficientOfVariation.ToString("F4"),
                null,
                memory.Duration);
        }

        // Write percentile outputs
        if (percentiles != null && percentiles.Count > 0)
        {
            // Sort values for percentile calculation
            var sorted = sortedValues.OrderBy(v => v).ToList();
            
            foreach (var p in percentiles)
            {
                var percentileValue = CalculatePercentile(sorted, p.Percentile);
                await Points.WriteOrAddValue(
                    p.OutputItemId,
                    percentileValue.ToString("F4"),
                    null,
                    memory.Duration);
            }
        }
    }

    /// <summary>
    /// Calculate all core statistics from a list of values
    /// </summary>
    private StatisticsResult CalculateStatistics(List<double> values)
    {
        if (values.Count == 0)
        {
            return new StatisticsResult();
        }

        var sorted = values.OrderBy(v => v).ToList();
        int n = sorted.Count;

        double min = sorted[0];
        double max = sorted[n - 1];
        double sum = values.Sum();
        double average = sum / n;
        double range = max - min;

        // Calculate median (50th percentile)
        double median;
        if (n % 2 == 0)
        {
            // Even number: average of two middle values
            median = (sorted[n / 2 - 1] + sorted[n / 2]) / 2.0;
        }
        else
        {
            // Odd number: middle value
            median = sorted[n / 2];
        }

        // Calculate sample standard deviation (using N-1 denominator for sample)
        double stdDev = 0;
        if (n > 1)
        {
            double sumSquaredDiffs = values.Sum(v => Math.Pow(v - average, 2));
            stdDev = Math.Sqrt(sumSquaredDiffs / (n - 1));
        }

        // Calculate Coefficient of Variation (CV = stddev / average * 100)
        // Handle division by zero
        double cv = 0;
        if (Math.Abs(average) > double.Epsilon)
        {
            cv = (stdDev / Math.Abs(average)) * 100;
        }

        return new StatisticsResult
        {
            Min = min,
            Max = max,
            Average = average,
            StdDev = stdDev,
            Range = range,
            Median = median,
            CoefficientOfVariation = cv,
            SampleCount = n
        };
    }

    /// <summary>
    /// Calculate percentile using linear interpolation
    /// </summary>
    /// <param name="sortedValues">Pre-sorted list of values</param>
    /// <param name="percentile">Percentile value (0-100)</param>
    private double CalculatePercentile(List<double> sortedValues, double percentile)
    {
        if (sortedValues.Count == 0)
            return 0;

        if (sortedValues.Count == 1)
            return sortedValues[0];

        // Clamp percentile to 0-100
        percentile = Math.Clamp(percentile, 0, 100);

        // Calculate the index (using linear interpolation method)
        double rank = (percentile / 100) * (sortedValues.Count - 1);
        int lowerIndex = (int)Math.Floor(rank);
        int upperIndex = (int)Math.Ceiling(rank);

        if (lowerIndex == upperIndex)
        {
            return sortedValues[lowerIndex];
        }

        // Linear interpolation between adjacent values
        double fraction = rank - lowerIndex;
        return sortedValues[lowerIndex] + fraction * (sortedValues[upperIndex] - sortedValues[lowerIndex]);
    }
}

/// <summary>
/// Container for calculated statistics
/// </summary>
public class StatisticsResult
{
    public double Min { get; set; }
    public double Max { get; set; }
    public double Average { get; set; }
    public double StdDev { get; set; }
    public double Range { get; set; }
    public double Median { get; set; }
    public double CoefficientOfVariation { get; set; }
    public int SampleCount { get; set; }
}
