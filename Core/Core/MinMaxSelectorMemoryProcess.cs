using System.Text.Json;
using Core.Libs;
using Core.Models;
using Core.RedisModels;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Process for selecting minimum or maximum values from multiple analog inputs.
/// Supports configurable failover strategies and optional index output.
/// </summary>
public class MinMaxSelectorMemoryProcess
{
    // Singleton instance
    private static MinMaxSelectorMemoryProcess? _instance;
    private static readonly object _lock = new object();
    private static Task? _runTask;

    private DataContext? _context;

    // Track last execution time for each memory to respect interval
    private readonly Dictionary<Guid, long> _lastExecutionTimes = new();

    // Private constructor to enforce Singleton
    private MinMaxSelectorMemoryProcess()
    {
        _context = null;
    }

    // Singleton instance access
    public static MinMaxSelectorMemoryProcess Instance
    {
        get
        {
            lock (_lock)
            {
                if (_instance == null)
                {
                    _instance = new MinMaxSelectorMemoryProcess();
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

        await _runTask;
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
                MyLog.LogJson("MinMaxSelectorMemoryProcess", "Database connection established");
                return;
            }
            catch (Exception ex)
            {
                MyLog.LogJson("MinMaxSelectorMemoryProcess", $"Waiting for database connection... Attempt {i + 1}/{maxRetries}");
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
        var memories = await _context!.MinMaxSelectorMemories
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
            // Parse input item IDs from JSON
            try
            {
                var inputIds = JsonSerializer.Deserialize<List<string>>(memory.InputItemIds);
                if (inputIds != null)
                {
                    foreach (var inputId in inputIds)
                    {
                        allInputIds.Add(inputId);
                    }
                }
            }
            catch
            {
                // Ignore parse errors, will be handled in ProcessSingleMemory
            }
            
            allOutputIds.Add(memory.OutputItemId.ToString());
            
            if (memory.SelectedIndexOutputItemId.HasValue)
            {
                allOutputIds.Add(memory.SelectedIndexOutputItemId.Value.ToString());
            }
        }

        // Batch fetch all required Redis items
        var inputItemsCache = await Points.GetFinalItemsBatch(allInputIds.ToList());
        var outputItemsCache = await Points.GetRawItemsBatch(allOutputIds.ToList());

        MyLog.Debug("Batch fetched Redis items for MinMaxSelector processing", new Dictionary<string, object?>
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
                await ProcessSingleMemory(memory, inputItemsCache, epochTime);
                _lastExecutionTimes[memory.Id] = epochTime;
            }
            catch (Exception ex)
            {
                MyLog.LogJson($"Failed to process MinMaxSelectorMemory {memory.Id}", ex);
            }
        }
    }

    private async Task ProcessSingleMemory(
        MinMaxSelectorMemory memory,
        Dictionary<string, FinalItemRedis> inputItemsCache,
        long epochTime)
    {
        // Parse input item IDs
        List<string>? inputIds;
        try
        {
            inputIds = JsonSerializer.Deserialize<List<string>>(memory.InputItemIds);
        }
        catch (Exception ex)
        {
            MyLog.Debug($"MinMaxSelectorMemory {memory.Id}: Failed to parse InputItemIds JSON: {ex.Message}");
            return;
        }

        if (inputIds == null || inputIds.Count < MinMaxSelectorMemory.MinInputCount)
        {
            MyLog.Debug($"MinMaxSelectorMemory {memory.Id}: Not enough input items configured");
            return;
        }

        // Collect valid input values with their indices
        var validInputs = new List<(int Index, double Value)>();

        for (int i = 0; i < inputIds.Count; i++)
        {
            var inputId = inputIds[i];
            
            // Check if input exists in cache and has valid value
            if (!inputItemsCache.TryGetValue(inputId, out var inputItem))
            {
                MyLog.Debug($"MinMaxSelectorMemory {memory.Id}: Input {i + 1} ({inputId}) not found in cache");
                continue; // Bad input - not in cache
            }

            // Check value validity (not null/empty and parseable)
            if (string.IsNullOrEmpty(inputItem.Value))
            {
                MyLog.Debug($"MinMaxSelectorMemory {memory.Id}: Input {i + 1} has empty value");
                continue; // Bad input - empty value
            }

            if (!double.TryParse(inputItem.Value, out var value))
            {
                MyLog.Debug($"MinMaxSelectorMemory {memory.Id}: Input {i + 1} has unparseable value: {inputItem.Value}");
                continue; // Bad input - can't parse
            }

            // Check for NaN or Infinity
            if (double.IsNaN(value) || double.IsInfinity(value))
            {
                MyLog.Debug($"MinMaxSelectorMemory {memory.Id}: Input {i + 1} has NaN/Infinity value");
                continue; // Bad input - NaN or Infinity
            }

            // Valid input - add to list (1-based index for output)
            validInputs.Add((i + 1, value));
        }

        // Handle case where no valid inputs are found
        if (validInputs.Count == 0)
        {
            await HandleNoValidInputs(memory, epochTime);
            return;
        }

        // Select value based on selection mode
        (int SelectedIndex, double SelectedValue) selectedInput;

        if (memory.SelectionMode == MinMaxSelectionMode.Minimum)
        {
            selectedInput = validInputs.MinBy(x => x.Value);
        }
        else // Maximum
        {
            selectedInput = validInputs.MaxBy(x => x.Value);
        }

        // Apply failover logic if needed
        // (FallbackToOpposite only applies when the previously selected input goes bad,
        // but since we already have valid inputs, we just use normal selection)
        
        // For FallbackToOpposite: if current selection is different and previous was bad,
        // we could consider switching. But the simple approach is: if we have valid inputs,
        // just select based on mode. The failover is really for when inputs go bad.
        
        // Write output value
        await Points.WriteOrAddValue(
            memory.OutputItemId,
            selectedInput.SelectedValue.ToString("F4"),
            null,
            memory.Duration);

        // Write selected index if configured
        if (memory.SelectedIndexOutputItemId.HasValue)
        {
            await Points.WriteOrAddValue(
                memory.SelectedIndexOutputItemId.Value,
                selectedInput.SelectedIndex.ToString(),
                null,
                memory.Duration);
        }

        // Update runtime state
        bool stateChanged = memory.LastSelectedIndex != selectedInput.SelectedIndex ||
                           memory.LastSelectedValue != selectedInput.SelectedValue;
        
        if (stateChanged)
        {
            memory.LastSelectedIndex = selectedInput.SelectedIndex;
            memory.LastSelectedValue = selectedInput.SelectedValue;
            _context!.MinMaxSelectorMemories.Update(memory);
            await _context.SaveChangesAsync();
        }

        MyLog.Debug($"MinMaxSelectorMemory {memory.Id}: Selected input {selectedInput.SelectedIndex} with value {selectedInput.SelectedValue:F4} ({memory.SelectionMode} of {validInputs.Count} valid inputs)");
    }

    /// <summary>
    /// Handle the case when no valid inputs are available.
    /// Applies the configured failover strategy.
    /// </summary>
    private async Task HandleNoValidInputs(MinMaxSelectorMemory memory, long epochTime)
    {
        switch (memory.FailoverMode)
        {
            case MinMaxFailoverMode.IgnoreBad:
                // Don't update output - leave it at last value
                MyLog.Debug($"MinMaxSelectorMemory {memory.Id}: No valid inputs, IgnoreBad mode - output unchanged");
                break;

            case MinMaxFailoverMode.FallbackToOpposite:
                // With no valid inputs, fallback doesn't help - treat like IgnoreBad
                MyLog.Debug($"MinMaxSelectorMemory {memory.Id}: No valid inputs, FallbackToOpposite has no valid inputs to fall back to");
                break;

            case MinMaxFailoverMode.HoldLastGood:
                // Output the last known good value if available
                if (memory.LastSelectedValue.HasValue)
                {
                    await Points.WriteOrAddValue(
                        memory.OutputItemId,
                        memory.LastSelectedValue.Value.ToString("F4"),
                        null,
                        memory.Duration);

                    if (memory.SelectedIndexOutputItemId.HasValue && memory.LastSelectedIndex.HasValue)
                    {
                        await Points.WriteOrAddValue(
                            memory.SelectedIndexOutputItemId.Value,
                            memory.LastSelectedIndex.Value.ToString(),
                            null,
                            memory.Duration);
                    }

                    MyLog.Debug($"MinMaxSelectorMemory {memory.Id}: No valid inputs, HoldLastGood - using last value {memory.LastSelectedValue.Value:F4} from input {memory.LastSelectedIndex}");
                }
                else
                {
                    MyLog.Debug($"MinMaxSelectorMemory {memory.Id}: No valid inputs and no last good value available");
                }
                break;
        }
    }
}
