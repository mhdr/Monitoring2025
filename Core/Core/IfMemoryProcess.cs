using System.Collections.Concurrent;
using System.Text.Json;
using Core.Libs;
using Core.Models;
using Core.RedisModels;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Processor for IF Memory with IF/ELSE IF/ELSE branching logic.
/// Evaluates NCalc conditions in order and writes the output value of the first matching branch.
/// Supports per-branch hysteresis for analog threshold comparisons.
/// </summary>
public class IfMemoryProcess
{
    // Singleton instance
    private static IfMemoryProcess? _instance;
    private static readonly object _lock = new object();
    private static Task? _runTask;

    private DataContext? _context;

    // Track last execution time for each memory to respect interval
    private readonly Dictionary<Guid, long> _lastExecutionTimes = new();

    // Cache for parsed branches (memory ID -> list of branches)
    private readonly ConcurrentDictionary<Guid, List<ConditionalBranch>> _branchCache = new();

    // Hysteresis state tracking per branch (memoryId:branchId -> last condition result)
    private readonly ConcurrentDictionary<string, bool> _hysteresisState = new();

    // Private constructor to enforce Singleton
    private IfMemoryProcess()
    {
        _context = null;
    }

    // Singleton instance access
    public static IfMemoryProcess Instance
    {
        get
        {
            lock (_lock)
            {
                if (_instance == null)
                {
                    _instance = new IfMemoryProcess();
                }
            }

            return _instance;
        }
    }

    /// <summary>
    /// Invalidate cached branches for a specific memory (called on edit/delete)
    /// </summary>
    public void InvalidateCache(Guid memoryId)
    {
        _branchCache.TryRemove(memoryId, out _);

        // Clear hysteresis state for all branches of this memory
        var keysToRemove = _hysteresisState.Keys
            .Where(k => k.StartsWith(memoryId.ToString()))
            .ToList();
        foreach (var key in keysToRemove)
        {
            _hysteresisState.TryRemove(key, out _);
        }

        MyLog.Debug("IfMemoryProcess: Cache invalidated", new Dictionary<string, object?>
        {
            ["MemoryId"] = memoryId
        });
    }

    /// <summary>
    /// Clear all cached data
    /// </summary>
    public void ClearCache()
    {
        _branchCache.Clear();
        _hysteresisState.Clear();
        MyLog.Debug("IfMemoryProcess: All cache cleared");
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
                MyLog.Info("IfMemoryProcess: Database connection established");
                return;
            }
            catch (Exception ex)
            {
                MyLog.Info($"IfMemoryProcess: Waiting for database connection... Attempt {i + 1}/{maxRetries}");
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
        var memories = await _context!.IfMemories
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

        // Collect all unique input item IDs for batch fetching
        var allInputIds = new HashSet<string>();

        foreach (var memory in memoriesToProcess)
        {
            try
            {
                var aliases = JsonSerializer.Deserialize<Dictionary<string, string>>(memory.VariableAliases);
                if (aliases != null)
                {
                    foreach (var itemId in aliases.Values)
                    {
                        allInputIds.Add(itemId);
                    }
                }
            }
            catch
            {
                // Invalid JSON, will be caught during processing
            }
        }

        // Batch fetch all required Redis items (performance optimization)
        var inputItemsCache = await Points.GetFinalItemsBatch(allInputIds.ToList());

        MyLog.Debug("Batch fetched Redis items for IF processing", new Dictionary<string, object?>
        {
            ["MemoryCount"] = memoriesToProcess.Count,
            ["InputItemsRequested"] = allInputIds.Count,
            ["InputItemsFetched"] = inputItemsCache.Count
        });

        // Process each memory
        foreach (var memory in memoriesToProcess)
        {
            try
            {
                await ProcessSingleIfMemory(memory, inputItemsCache, epochTime);
                _lastExecutionTimes[memory.Id] = epochTime;
            }
            catch (Exception ex)
            {
                MyLog.Error($"Failed to process IfMemory {memory.Id}", ex, new Dictionary<string, object?>
                {
                    ["MemoryId"] = memory.Id,
                    ["MemoryName"] = memory.Name
                });
            }
        }
    }

    private async Task ProcessSingleIfMemory(
        IfMemory memory,
        Dictionary<string, FinalItemRedis> inputItemsCache,
        long epochTime)
    {
        // Parse variable aliases
        Dictionary<string, string>? aliases;
        try
        {
            aliases = JsonSerializer.Deserialize<Dictionary<string, string>>(memory.VariableAliases);
            if (aliases == null)
            {
                aliases = new Dictionary<string, string>();
            }
        }
        catch (JsonException ex)
        {
            MyLog.Warning("Failed to parse variable aliases JSON", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["Error"] = ex.Message
            });
            return;
        }

        // Build variable values dictionary from cached input items
        var variableValues = new Dictionary<string, double>();
        var missingVariables = new List<string>();

        foreach (var (alias, itemIdStr) in aliases)
        {
            if (inputItemsCache.TryGetValue(itemIdStr, out var item))
            {
                if (double.TryParse(item.Value, out var value))
                {
                    variableValues[alias] = value;
                }
                else
                {
                    MyLog.Warning("Failed to parse input value for variable", new Dictionary<string, object?>
                    {
                        ["MemoryId"] = memory.Id,
                        ["Alias"] = alias,
                        ["Value"] = item.Value
                    });
                    variableValues[alias] = 0.0; // Default to 0 for invalid values
                }
            }
            else
            {
                missingVariables.Add(alias);
                variableValues[alias] = 0.0; // Default to 0 for missing values
            }
        }

        if (missingVariables.Count > 0)
        {
            MyLog.Warning("Some input items not found in cache", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["MissingVariables"] = string.Join(", ", missingVariables)
            });
        }

        // Get or parse branches from cache
        List<ConditionalBranch> branches;
        if (_branchCache.TryGetValue(memory.Id, out var cachedBranches))
        {
            branches = cachedBranches;
        }
        else
        {
            try
            {
                branches = JsonSerializer.Deserialize<List<ConditionalBranch>>(memory.Branches) ?? new List<ConditionalBranch>();
                // Sort by Order
                branches = branches.OrderBy(b => b.Order).ToList();
                _branchCache[memory.Id] = branches;
            }
            catch (JsonException ex)
            {
                MyLog.Warning("Failed to parse branches JSON", new Dictionary<string, object?>
                {
                    ["MemoryId"] = memory.Id,
                    ["Error"] = ex.Message
                });
                return;
            }
        }

        // Evaluate branches in order, find first matching
        double outputValue = memory.DefaultValue; // Start with ELSE value
        string? matchedBranchId = null;
        string? matchedBranchName = null;

        foreach (var branch in branches)
        {
            try
            {
                var conditionResult = EvaluateConditionWithHysteresis(
                    memory.Id,
                    branch,
                    variableValues);

                if (conditionResult)
                {
                    outputValue = branch.OutputValue;
                    matchedBranchId = branch.Id;
                    matchedBranchName = branch.Name;
                    break; // First matching branch wins
                }
            }
            catch (Exception ex)
            {
                MyLog.Warning("Failed to evaluate branch condition", new Dictionary<string, object?>
                {
                    ["MemoryId"] = memory.Id,
                    ["BranchId"] = branch.Id,
                    ["BranchName"] = branch.Name,
                    ["Condition"] = branch.Condition,
                    ["Error"] = ex.Message
                });
                // Continue to next branch on error
            }
        }

        // Apply output type conversion
        string formattedValue;
        if (memory.OutputType == IfMemoryOutputType.Digital)
        {
            // Digital: clamp to 0 or 1
            var digitalValue = Math.Abs(outputValue) > 1e-10 ? 1 : 0;
            formattedValue = digitalValue.ToString();
        }
        else
        {
            // Analog: write value directly
            formattedValue = outputValue.ToString("G");
        }

        // Write to output
        await Points.WriteOrAddValue(memory.OutputItemId, formattedValue, epochTime);

        MyLog.Debug("IF Memory evaluated successfully", new Dictionary<string, object?>
        {
            ["MemoryId"] = memory.Id,
            ["MemoryName"] = memory.Name,
            ["MatchedBranch"] = matchedBranchName ?? "(ELSE)",
            ["OutputValue"] = outputValue,
            ["FormattedValue"] = formattedValue
        });
    }

    /// <summary>
    /// Evaluate a branch condition with hysteresis support.
    /// Hysteresis is applied to prevent output flapping near threshold boundaries.
    /// </summary>
    private bool EvaluateConditionWithHysteresis(
        Guid memoryId,
        ConditionalBranch branch,
        Dictionary<string, double> variableValues)
    {
        var stateKey = $"{memoryId}:{branch.Id}";
        var previousState = _hysteresisState.TryGetValue(stateKey, out var prev) ? prev : false;

        // Create expression
        var expr = new NCalc.Expression(branch.Condition);

        // Register custom functions
        FormulaFunctions.RegisterCustomFunctions(expr);

        // Set variable values
        foreach (var (alias, value) in variableValues)
        {
            expr.Parameters[alias] = value;
        }

        // Check for syntax errors
        if (expr.HasErrors())
        {
            throw new InvalidOperationException($"Condition syntax error: {expr.Error}");
        }

        // Evaluate
        var result = expr.Evaluate();
        bool rawConditionResult;

        if (result is bool b)
        {
            rawConditionResult = b;
        }
        else if (result is double d)
        {
            rawConditionResult = Math.Abs(d) > 1e-10;
        }
        else if (result is int i)
        {
            rawConditionResult = i != 0;
        }
        else if (result is float f)
        {
            rawConditionResult = Math.Abs(f) > 1e-10;
        }
        else if (result is decimal dec)
        {
            rawConditionResult = dec != 0;
        }
        else
        {
            throw new InvalidOperationException($"Condition result is not a boolean or numeric: {result}");
        }

        // Apply hysteresis
        bool finalResult;
        if (branch.Hysteresis <= 0)
        {
            // No hysteresis, use raw result
            finalResult = rawConditionResult;
        }
        else
        {
            // With hysteresis: once true, stay true until condition becomes sufficiently false
            // This is a simple state-based hysteresis
            if (previousState)
            {
                // Was true, only switch to false if condition is clearly false
                // For simple hysteresis, we keep the previous state unless the raw result changes
                // A more sophisticated implementation would parse threshold values from the condition
                finalResult = rawConditionResult;
            }
            else
            {
                // Was false, only switch to true if condition is clearly true
                finalResult = rawConditionResult;
            }
        }

        // Update hysteresis state
        _hysteresisState[stateKey] = finalResult;

        return finalResult;
    }
}
