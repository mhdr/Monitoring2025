using System.Collections.Concurrent;
using System.Text.Json;
using Core.Libs;
using Core.Models;
using Core.RedisModels;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Processor for Formula/Expression Memory with compiled expression caching for performance.
/// Evaluates custom NCalc expressions using input point values and writes results to output points.
/// </summary>
public class FormulaMemoryProcess
{
    // Singleton instance
    private static FormulaMemoryProcess? _instance;
    private static readonly object _lock = new object();
    private static Task? _runTask;

    private DataContext? _context;

    // Track last execution time for each memory to respect interval
    private readonly Dictionary<Guid, long> _lastExecutionTimes = new();

    // Cache for compiled expression delegates (memory ID -> cached expression)
    private readonly ConcurrentDictionary<Guid, CachedExpression> _expressionCache = new();

    // Private constructor to enforce Singleton
    private FormulaMemoryProcess()
    {
        _context = null;
    }

    // Singleton instance access
    public static FormulaMemoryProcess Instance
    {
        get
        {
            lock (_lock)
            {
                if (_instance == null)
                {
                    _instance = new FormulaMemoryProcess();
                }
            }

            return _instance;
        }
    }

    /// <summary>
    /// Invalidate cached expression for a specific memory (called on edit/delete)
    /// </summary>
    public void InvalidateCache(Guid memoryId)
    {
        _expressionCache.TryRemove(memoryId, out _);
        MyLog.Debug("FormulaMemoryProcess: Cache invalidated", new Dictionary<string, object?>
        {
            ["MemoryId"] = memoryId
        });
    }

    /// <summary>
    /// Clear all cached expressions
    /// </summary>
    public void ClearCache()
    {
        _expressionCache.Clear();
        MyLog.Debug("FormulaMemoryProcess: All cache cleared");
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
                MyLog.Info("FormulaMemoryProcess: Database connection established");
                return;
            }
            catch (Exception ex)
            {
                MyLog.Info($"FormulaMemoryProcess: Waiting for database connection... Attempt {i + 1}/{maxRetries}");
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
        var memories = await _context!.FormulaMemories
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

        MyLog.Debug("Batch fetched Redis items for Formula processing", new Dictionary<string, object?>
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
                await ProcessSingleFormula(memory, inputItemsCache, epochTime);
                _lastExecutionTimes[memory.Id] = epochTime;
            }
            catch (Exception ex)
            {
                MyLog.Error($"Failed to process FormulaMemory {memory.Id}", ex, new Dictionary<string, object?>
                {
                    ["MemoryId"] = memory.Id,
                    ["MemoryName"] = memory.Name
                });

                // Update last error in database
                try
                {
                    memory.LastError = ex.Message;
                    _context!.FormulaMemories.Update(memory);
                    await _context.SaveChangesAsync();
                }
                catch
                {
                    // Ignore error updating error message
                }
            }
        }
    }

    private async Task ProcessSingleFormula(
        FormulaMemory memory,
        Dictionary<string, FinalItemRedis> inputItemsCache,
        long epochTime)
    {
        // Parse variable aliases
        Dictionary<string, string>? aliases;
        try
        {
            aliases = JsonSerializer.Deserialize<Dictionary<string, string>>(memory.VariableAliases);
            if (aliases == null || aliases.Count == 0)
            {
                MyLog.Warning("Formula memory has no variable aliases", new Dictionary<string, object?>
                {
                    ["MemoryId"] = memory.Id,
                    ["MemoryName"] = memory.Name
                });
                return;
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

        // Get or compile expression
        double result;
        try
        {
            result = EvaluateExpression(memory, variableValues);
        }
        catch (Exception ex)
        {
            // Log error and update memory
            memory.LastError = ex.Message;
            _context!.FormulaMemories.Update(memory);
            await _context.SaveChangesAsync();
            throw;
        }

        // Format and write result to output
        var formattedValue = Math.Round(result, memory.DecimalPlaces).ToString($"F{memory.DecimalPlaces}");
        await Points.WriteOrAddValue(memory.OutputItemId, formattedValue, epochTime);

        // Update last evaluation time and clear any previous error
        if (memory.LastError != null || memory.LastEvaluationTime != epochTime)
        {
            memory.LastEvaluationTime = epochTime;
            memory.LastError = null;
            _context!.FormulaMemories.Update(memory);
            await _context.SaveChangesAsync();
        }

        MyLog.Debug("Formula evaluated successfully", new Dictionary<string, object?>
        {
            ["MemoryId"] = memory.Id,
            ["MemoryName"] = memory.Name,
            ["Expression"] = memory.Expression,
            ["Result"] = result,
            ["FormattedValue"] = formattedValue
        });
    }

    /// <summary>
    /// Evaluate expression using cache if available, otherwise compile and cache
    /// </summary>
    private double EvaluateExpression(FormulaMemory memory, Dictionary<string, double> variableValues)
    {
        var currentHash = FormulaMemories.ComputeExpressionHash(memory.Expression);

        // Check if we have a valid cached compiled delegate
        if (_expressionCache.TryGetValue(memory.Id, out var cached) && 
            cached.ExpressionHash == currentHash &&
            cached.CompiledDelegate != null)
        {
            // Use cached compiled delegate
            try
            {
                return cached.CompiledDelegate(variableValues);
            }
            catch (Exception ex)
            {
                // If cached delegate fails, try recompiling
                MyLog.Warning("Cached delegate failed, recompiling", new Dictionary<string, object?>
                {
                    ["MemoryId"] = memory.Id,
                    ["Error"] = ex.Message
                });
                _expressionCache.TryRemove(memory.Id, out _);
            }
        }

        // Compile and cache new expression
        var expr = new NCalc.Expression(memory.Expression);

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
            throw new InvalidOperationException($"Expression syntax error: {expr.Error}");
        }

        // Evaluate
        var result = expr.Evaluate();

        // Convert result to double
        double doubleResult;
        if (result is double d)
        {
            doubleResult = d;
        }
        else if (result is int i)
        {
            doubleResult = i;
        }
        else if (result is float f)
        {
            doubleResult = f;
        }
        else if (result is decimal dec)
        {
            doubleResult = (double)dec;
        }
        else if (result is bool b)
        {
            doubleResult = b ? 1.0 : 0.0;
        }
        else if (double.TryParse(result?.ToString(), out var parsed))
        {
            doubleResult = parsed;
        }
        else
        {
            throw new InvalidOperationException($"Expression result is not a number: {result}");
        }

        // Try to compile to lambda for future calls (performance optimization)
        try
        {
            // Create a compiled delegate that takes variable values dictionary
            var compiledDelegate = CreateCompiledDelegate(memory.Expression, variableValues.Keys.ToList());

            _expressionCache[memory.Id] = new CachedExpression
            {
                ExpressionHash = currentHash,
                CompiledDelegate = compiledDelegate,
                CompiledAt = DateTime.UtcNow
            };

            MyLog.Debug("Expression compiled and cached", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["Expression"] = memory.Expression
            });
        }
        catch (Exception ex)
        {
            // If compilation fails, we'll just use direct evaluation next time
            MyLog.Debug("Failed to compile expression to lambda, using direct evaluation", new Dictionary<string, object?>
            {
                ["MemoryId"] = memory.Id,
                ["Error"] = ex.Message
            });
        }

        return doubleResult;
    }

    /// <summary>
    /// Create a compiled delegate for faster repeated evaluations
    /// </summary>
    private Func<Dictionary<string, double>, double> CreateCompiledDelegate(string expression, List<string> variableNames)
    {
        return (Dictionary<string, double> variables) =>
        {
            var expr = new NCalc.Expression(expression);
            FormulaFunctions.RegisterCustomFunctions(expr);

            foreach (var varName in variableNames)
            {
                if (variables.TryGetValue(varName, out var value))
                {
                    expr.Parameters[varName] = value;
                }
                else
                {
                    expr.Parameters[varName] = 0.0;
                }
            }

            var result = expr.Evaluate();

            if (result is double d) return d;
            if (result is int i) return i;
            if (result is float f) return f;
            if (result is decimal dec) return (double)dec;
            if (result is bool b) return b ? 1.0 : 0.0;
            if (double.TryParse(result?.ToString(), out var parsed)) return parsed;

            throw new InvalidOperationException($"Expression result is not a number: {result}");
        };
    }
}

/// <summary>
/// Cached compiled expression with hash for invalidation
/// </summary>
public class CachedExpression
{
    /// <summary>
    /// SHA256 hash of expression string for detecting changes
    /// </summary>
    public string ExpressionHash { get; set; } = "";

    /// <summary>
    /// Compiled delegate for fast evaluation
    /// </summary>
    public Func<Dictionary<string, double>, double>? CompiledDelegate { get; set; }

    /// <summary>
    /// When the expression was compiled
    /// </summary>
    public DateTime CompiledAt { get; set; }
}
