using System.Text.Json;
using Core.Libs;
using Core.Models;
using Core.RedisModels;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Processes ComparisonMemory configurations with N-out-of-M voting logic.
/// Supports multiple comparison groups combined with AND/OR/XOR operators.
/// Implements both threshold hysteresis (for analog comparisons) and voting hysteresis.
/// </summary>
public class ComparisonMemoryProcess
{
    // Singleton instance
    private static ComparisonMemoryProcess? _instance;
    private static readonly object _lock = new object();
    private static Task? _runTask;

    private DataContext? _context;

    // Track last execution time for each memory to respect interval
    private readonly Dictionary<Guid, long> _lastExecutionTimes = new();

    // Track current output state for hysteresis processing
    // Key: MemoryId, Value: (overall output state, group states with their vote counts)
    private readonly Dictionary<Guid, MemoryState> _memoryStates = new();

    private class MemoryState
    {
        public bool CurrentOutput { get; set; }
        public Dictionary<string, GroupState> GroupStates { get; set; } = new();
    }

    private class GroupState
    {
        public bool CurrentResult { get; set; }
        public int LastVoteCount { get; set; }
        // Track individual input states for threshold hysteresis
        public Dictionary<string, bool> InputStates { get; set; } = new();
    }

    // Private constructor to enforce Singleton
    private ComparisonMemoryProcess()
    {
        _context = null;
    }

    // Singleton instance access
    public static ComparisonMemoryProcess Instance
    {
        get
        {
            lock (_lock)
            {
                if (_instance == null)
                {
                    _instance = new ComparisonMemoryProcess();
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
                MyLog.LogJson("ComparisonMemoryProcess", "Database connection established");
                return;
            }
            catch (Exception ex)
            {
                MyLog.LogJson("ComparisonMemoryProcess", $"Waiting for database connection... Attempt {i + 1}/{maxRetries}");
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
        var memories = await _context!.ComparisonMemories
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
                var groups = JsonSerializer.Deserialize<List<ComparisonGroup>>(memory.ComparisonGroups);
                if (groups != null)
                {
                    foreach (var group in groups)
                    {
                        foreach (var id in group.InputItemIds)
                        {
                            allInputIds.Add(id);
                        }
                    }
                }
                allOutputIds.Add(memory.OutputItemId.ToString());
            }
            catch (Exception ex)
            {
                MyLog.LogJson($"Failed to parse ComparisonGroups for ComparisonMemory {memory.Id}", ex);
            }
        }

        // Batch fetch all required Redis items
        var inputItemsCache = await Points.GetFinalItemsBatch(allInputIds.ToList());
        var outputItemsCache = await Points.GetRawItemsBatch(allOutputIds.ToList());

        MyLog.Debug("Batch fetched Redis items for Comparison processing", new Dictionary<string, object?>
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
                await ProcessSingleMemory(memory, inputItemsCache, outputItemsCache);
                _lastExecutionTimes[memory.Id] = epochTime;
            }
            catch (Exception ex)
            {
                MyLog.LogJson($"Failed to process ComparisonMemory {memory.Id}", ex);
            }
        }
    }

    private async Task ProcessSingleMemory(
        ComparisonMemory memory,
        Dictionary<string, FinalItemRedis> inputItemsCache,
        Dictionary<string, RawItemRedis> outputItemsCache)
    {
        // Parse comparison groups
        List<ComparisonGroup> groups;
        try
        {
            groups = JsonSerializer.Deserialize<List<ComparisonGroup>>(memory.ComparisonGroups) ?? new List<ComparisonGroup>();
        }
        catch (Exception ex)
        {
            MyLog.LogJson($"Failed to parse ComparisonGroups for ComparisonMemory {memory.Id}", ex);
            return;
        }

        if (groups.Count == 0)
            return;

        // Initialize memory state if not exists
        if (!_memoryStates.TryGetValue(memory.Id, out var memoryState))
        {
            memoryState = new MemoryState();
            _memoryStates[memory.Id] = memoryState;
        }

        // Evaluate each group
        var groupResults = new List<bool>();
        foreach (var group in groups)
        {
            // Initialize group state if not exists
            if (!memoryState.GroupStates.TryGetValue(group.Id, out var groupState))
            {
                groupState = new GroupState();
                memoryState.GroupStates[group.Id] = groupState;
            }

            var groupResult = EvaluateGroup(group, groupState, inputItemsCache);
            groupResults.Add(groupResult);
        }

        // Combine group results based on operator
        bool finalResult = CombineGroupResults(groupResults, memory.GroupOperator);

        // Apply output inversion if configured
        if (memory.InvertOutput)
        {
            finalResult = !finalResult;
        }

        // Update output item
        var outputIdStr = memory.OutputItemId.ToString();
        if (outputItemsCache.TryGetValue(outputIdStr, out var outputItem))
        {
            var newValue = finalResult ? "1" : "0";
            
            // Only update if value changed
            if (outputItem.Value != newValue)
            {
                MyLog.Debug($"ComparisonMemory {memory.Id}: Output changed from {outputItem.Value} to {newValue}", new Dictionary<string, object?>
                {
                    ["MemoryName"] = memory.Name,
                    ["GroupResults"] = groupResults,
                    ["GroupOperator"] = memory.GroupOperator.ToString(),
                    ["FinalResult"] = finalResult
                });

                await Points.SetRawItem(new RawItemRedis
                {
                    ItemId = Guid.Parse(outputIdStr),
                    Value = newValue,
                    Time = DateTimeOffset.Now.ToUnixTimeSeconds()
                });
            }
        }
        else
        {
            MyLog.Warning($"ComparisonMemory {memory.Id}: Output item {outputIdStr} not found in cache");
        }

        // Update memory state
        memoryState.CurrentOutput = finalResult;
    }

    /// <summary>
    /// Evaluates a single comparison group using N-out-of-M voting logic with hysteresis.
    /// </summary>
    private bool EvaluateGroup(
        ComparisonGroup group,
        GroupState groupState,
        Dictionary<string, FinalItemRedis> inputItemsCache)
    {
        int votesTrue = 0;
        int totalInputs = group.InputItemIds.Count;

        foreach (var inputIdStr in group.InputItemIds)
        {
            // Initialize input state if not exists
            if (!groupState.InputStates.TryGetValue(inputIdStr, out var currentInputState))
            {
                currentInputState = false;
                groupState.InputStates[inputIdStr] = currentInputState;
            }

            if (!inputItemsCache.TryGetValue(inputIdStr, out var inputItem))
            {
                // Input not found, treat as false
                continue;
            }

            bool inputMeetsCondition;
            
            if (group.ComparisonMode == ComparisonMode.Analog)
            {
                inputMeetsCondition = EvaluateAnalogInput(
                    inputItem.Value,
                    group.CompareType,
                    group.Threshold1 ?? 0,
                    group.Threshold2,
                    group.ThresholdHysteresis,
                    currentInputState);
            }
            else // Digital mode
            {
                inputMeetsCondition = EvaluateDigitalInput(inputItem.Value, group.DigitalValue ?? "1");
            }

            // Update input state
            groupState.InputStates[inputIdStr] = inputMeetsCondition;

            if (inputMeetsCondition)
            {
                votesTrue++;
            }
        }

        // Apply voting hysteresis
        bool groupResult = ApplyVotingHysteresis(
            votesTrue,
            group.RequiredVotes,
            group.VotingHysteresis,
            totalInputs,
            groupState.CurrentResult);

        // Update group state
        groupState.LastVoteCount = votesTrue;
        groupState.CurrentResult = groupResult;

        return groupResult;
    }

    /// <summary>
    /// Evaluates an analog input value against threshold with hysteresis.
    /// </summary>
    private bool EvaluateAnalogInput(
        string? valueStr,
        int compareType,
        double threshold1,
        double? threshold2,
        double hysteresis,
        bool currentState)
    {
        if (string.IsNullOrEmpty(valueStr) || !double.TryParse(valueStr, out var value))
        {
            return false;
        }

        // Calculate hysteresis bounds
        double onThreshold1, offThreshold1;
        double? onThreshold2 = null, offThreshold2 = null;

        switch ((CompareType)compareType)
        {
            case CompareType.Higher:
                // value > threshold
                // Turn ON when value > threshold + hysteresis
                // Turn OFF when value < threshold - hysteresis
                onThreshold1 = threshold1 + hysteresis;
                offThreshold1 = threshold1 - hysteresis;
                
                if (!currentState)
                {
                    return value > onThreshold1;
                }
                else
                {
                    return value >= offThreshold1;
                }

            case CompareType.Lower:
                // value < threshold
                // Turn ON when value < threshold - hysteresis
                // Turn OFF when value > threshold + hysteresis
                onThreshold1 = threshold1 - hysteresis;
                offThreshold1 = threshold1 + hysteresis;
                
                if (!currentState)
                {
                    return value < onThreshold1;
                }
                else
                {
                    return value <= offThreshold1;
                }

            case CompareType.Equal:
                // value == threshold (with tolerance)
                // Use hysteresis as tolerance band
                var lowerBound = threshold1 - hysteresis;
                var upperBound = threshold1 + hysteresis;
                return value >= lowerBound && value <= upperBound;

            case CompareType.NotEqual:
                // value != threshold (with tolerance)
                var notEqLower = threshold1 - hysteresis;
                var notEqUpper = threshold1 + hysteresis;
                return value < notEqLower || value > notEqUpper;

            case CompareType.Between:
                // value is between threshold1 and threshold2
                if (!threshold2.HasValue)
                    return false;

                onThreshold1 = threshold1 + hysteresis;
                onThreshold2 = threshold2.Value - hysteresis;
                offThreshold1 = threshold1 - hysteresis;
                offThreshold2 = threshold2.Value + hysteresis;
                
                if (!currentState)
                {
                    return value > onThreshold1 && value < onThreshold2.Value;
                }
                else
                {
                    return value > offThreshold1 && value < offThreshold2.Value;
                }

            default:
                return false;
        }
    }

    /// <summary>
    /// Evaluates a digital input value against expected value.
    /// </summary>
    private bool EvaluateDigitalInput(string? valueStr, string expectedValue)
    {
        if (string.IsNullOrEmpty(valueStr))
        {
            return false;
        }

        // Normalize values for comparison
        var normalizedValue = valueStr.Trim().ToLower();
        var normalizedExpected = expectedValue.Trim().ToLower();

        // Handle various true representations
        bool isTrue = normalizedValue == "1" || normalizedValue == "true" || normalizedValue == "on";
        bool isFalse = normalizedValue == "0" || normalizedValue == "false" || normalizedValue == "off";

        if (normalizedExpected == "1" || normalizedExpected == "true")
        {
            return isTrue;
        }
        else
        {
            return isFalse;
        }
    }

    /// <summary>
    /// Applies voting hysteresis to prevent flapping on vote count changes.
    /// </summary>
    private bool ApplyVotingHysteresis(
        int currentVotes,
        int requiredVotes,
        int votingHysteresis,
        int totalInputs,
        bool currentState)
    {
        if (votingHysteresis <= 0)
        {
            // No hysteresis - simple threshold comparison
            return currentVotes >= requiredVotes;
        }

        // With hysteresis:
        // Turn ON when votes >= requiredVotes + votingHysteresis
        // Turn OFF when votes < requiredVotes - votingHysteresis
        int onThreshold = Math.Min(requiredVotes + votingHysteresis, totalInputs);
        int offThreshold = Math.Max(requiredVotes - votingHysteresis, 0);

        if (!currentState)
        {
            // Currently OFF - need higher threshold to turn ON
            return currentVotes >= onThreshold;
        }
        else
        {
            // Currently ON - need lower threshold to turn OFF
            return currentVotes >= offThreshold;
        }
    }

    /// <summary>
    /// Combines multiple group results using the specified operator.
    /// </summary>
    private bool CombineGroupResults(List<bool> groupResults, GroupOperator op)
    {
        if (groupResults.Count == 0)
            return false;

        switch (op)
        {
            case GroupOperator.And:
                return groupResults.All(r => r);

            case GroupOperator.Or:
                return groupResults.Any(r => r);

            case GroupOperator.Xor:
                // XOR: exactly one must be true
                return groupResults.Count(r => r) == 1;

            default:
                return false;
        }
    }
}
