using System.Text.Json;
using Core.Libs;
using Core.Models;
using Core.RedisModels;
using Microsoft.EntityFrameworkCore;

namespace Core;

public class AverageMemoryProcess
{
    // Singleton instance
    private static AverageMemoryProcess? _instance;
    private static readonly object _lock = new object();
    private static Task? _runTask;

    private DataContext? _context;

    // Track last execution time for each memory to respect interval
    private readonly Dictionary<Guid, long> _lastExecutionTimes = new();

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
