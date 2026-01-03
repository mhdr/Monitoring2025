using System.Linq.Expressions;
using System.Text.Json;
using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Helper class for AverageMemory CRUD operations
/// </summary>
public class AverageMemories
{
    /// <summary>
    /// Get all average memory configurations
    /// </summary>
    public static async Task<List<AverageMemory>?> GetAverageMemories()
    {
        var context = new DataContext();
        var found = await context.AverageMemories.ToListAsync();
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Get a specific average memory by predicate
    /// </summary>
    public static async Task<AverageMemory?> GetAverageMemory(Expression<Func<AverageMemory, bool>> predicate)
    {
        var context = new DataContext();
        var found = await context.AverageMemories.FirstOrDefaultAsync(predicate);
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Add a new average memory configuration
    /// </summary>
    public static async Task<(bool Success, Guid? Id, string? ErrorMessage)> AddAverageMemory(AverageMemory averageMemory)
    {
        try
        {
            var context = new DataContext();

            // Validate and parse InputItemIds JSON
            List<Guid> inputIds;
            try
            {
                var inputIdStrings = JsonSerializer.Deserialize<List<string>>(averageMemory.InputItemIds);
                if (inputIdStrings == null || inputIdStrings.Count == 0)
                {
                    await context.DisposeAsync();
                    return (false, null, "InputItemIds must contain at least one item");
                }

                inputIds = inputIdStrings.Select(s => Guid.Parse(s)).ToList();
            }
            catch (Exception ex)
            {
                await context.DisposeAsync();
                return (false, null, $"Invalid InputItemIds JSON format: {ex.Message}");
            }

            // Validate all input items exist and are analog types
            foreach (var inputId in inputIds)
            {
                var inputItem = await context.MonitoringItems.FindAsync(inputId);
                if (inputItem == null)
                {
                    await context.DisposeAsync();
                    return (false, null, $"Input item {inputId} not found");
                }

                if (inputItem.ItemType != ItemType.AnalogInput && inputItem.ItemType != ItemType.AnalogOutput)
                {
                    await context.DisposeAsync();
                    return (false, null, $"Input item {inputId} must be AnalogInput or AnalogOutput");
                }
            }

            // Validate output item exists
            if (!averageMemory.OutputItemId.HasValue)
            {
                await context.DisposeAsync();
                return (false, null, "Output item is required");
            }
            
            var outputItem = await context.MonitoringItems.FindAsync(averageMemory.OutputItemId.Value);
            if (outputItem == null)
            {
                await context.DisposeAsync();
                return (false, null, "Output item not found");
            }

            // Validate output item is analog type
            if (outputItem.ItemType != ItemType.AnalogInput && outputItem.ItemType != ItemType.AnalogOutput)
            {
                await context.DisposeAsync();
                return (false, null, "Output item must be AnalogInput or AnalogOutput");
            }

            // Validate output item is not in input items
            if (inputIds.Contains(averageMemory.OutputItemId.Value))
            {
                await context.DisposeAsync();
                return (false, null, "Output item cannot be in the input items list");
            }

            // Validate weights if provided
            if (!string.IsNullOrWhiteSpace(averageMemory.Weights))
            {
                try
                {
                    var weights = JsonSerializer.Deserialize<List<double>>(averageMemory.Weights);
                    if (weights == null)
                    {
                        await context.DisposeAsync();
                        return (false, null, "Weights JSON is invalid");
                    }

                    if (weights.Count != inputIds.Count)
                    {
                        await context.DisposeAsync();
                        return (false, null, $"Weights array length ({weights.Count}) must match InputItemIds length ({inputIds.Count})");
                    }

                    if (weights.Any(w => w <= 0))
                    {
                        await context.DisposeAsync();
                        return (false, null, "All weights must be positive numbers");
                    }
                }
                catch (Exception ex)
                {
                    await context.DisposeAsync();
                    return (false, null, $"Invalid Weights JSON format: {ex.Message}");
                }
            }

            // Validate interval
            if (averageMemory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, null, "Interval must be greater than 0");
            }

            // Validate stale timeout
            if (averageMemory.StaleTimeout <= 0)
            {
                await context.DisposeAsync();
                return (false, null, "StaleTimeout must be greater than 0");
            }

            // Validate outlier threshold
            if (averageMemory.OutlierThreshold <= 0)
            {
                await context.DisposeAsync();
                return (false, null, "OutlierThreshold must be greater than 0");
            }

            // Validate minimum inputs
            if (averageMemory.MinimumInputs < 1)
            {
                await context.DisposeAsync();
                return (false, null, "MinimumInputs must be at least 1");
            }

            if (averageMemory.MinimumInputs > inputIds.Count)
            {
                await context.DisposeAsync();
                return (false, null, $"MinimumInputs ({averageMemory.MinimumInputs}) cannot exceed number of input items ({inputIds.Count})");
            }

            // Validate moving average parameters
            if (averageMemory.WindowSize < 2 || averageMemory.WindowSize > 1000)
            {
                await context.DisposeAsync();
                return (false, null, "WindowSize must be between 2 and 1000");
            }

            if (averageMemory.Alpha < 0.01 || averageMemory.Alpha > 1.0)
            {
                await context.DisposeAsync();
                return (false, null, "Alpha must be between 0.01 and 1.0");
            }

            context.AverageMemories.Add(averageMemory);
            await context.SaveChangesAsync();
            var id = averageMemory.Id;
            await context.DisposeAsync();
            return (true, id, null);
        }
        catch (Exception e)
        {
            MyLog.LogJson(e);
            return (false, null, e.Message);
        }
    }

    /// <summary>
    /// Edit an existing average memory configuration
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> EditAverageMemory(AverageMemory averageMemory)
    {
        try
        {
            var context = new DataContext();

            // Validate average memory exists
            var existing = await context.AverageMemories.AsNoTracking().FirstOrDefaultAsync(a => a.Id == averageMemory.Id);
            if (existing == null)
            {
                await context.DisposeAsync();
                return (false, "Average memory not found");
            }

            // Validate and parse InputItemIds JSON
            List<Guid> inputIds;
            try
            {
                var inputIdStrings = JsonSerializer.Deserialize<List<string>>(averageMemory.InputItemIds);
                if (inputIdStrings == null || inputIdStrings.Count == 0)
                {
                    await context.DisposeAsync();
                    return (false, "InputItemIds must contain at least one item");
                }

                inputIds = inputIdStrings.Select(s => Guid.Parse(s)).ToList();
            }
            catch (Exception ex)
            {
                await context.DisposeAsync();
                return (false, $"Invalid InputItemIds JSON format: {ex.Message}");
            }

            // Validate all input items exist and are analog types
            foreach (var inputId in inputIds)
            {
                var inputItem = await context.MonitoringItems.FindAsync(inputId);
                if (inputItem == null)
                {
                    await context.DisposeAsync();
                    return (false, $"Input item {inputId} not found");
                }

                if (inputItem.ItemType != ItemType.AnalogInput && inputItem.ItemType != ItemType.AnalogOutput)
                {
                    await context.DisposeAsync();
                    return (false, $"Input item {inputId} must be AnalogInput or AnalogOutput");
                }
            }

            // Validate output item exists
            if (!averageMemory.OutputItemId.HasValue)
            {
                await context.DisposeAsync();
                return (false, "Output item is required");
            }
            
            var outputItem = await context.MonitoringItems.FindAsync(averageMemory.OutputItemId.Value);
            if (outputItem == null)
            {
                await context.DisposeAsync();
                return (false, "Output item not found");
            }

            // Validate output item is analog type
            if (outputItem.ItemType != ItemType.AnalogInput && outputItem.ItemType != ItemType.AnalogOutput)
            {
                await context.DisposeAsync();
                return (false, "Output item must be AnalogInput or AnalogOutput");
            }

            // Validate output item is not in input items
            if (inputIds.Contains(averageMemory.OutputItemId.Value))
            {
                await context.DisposeAsync();
                return (false, "Output item cannot be in the input items list");
            }

            // Validate weights if provided
            if (!string.IsNullOrWhiteSpace(averageMemory.Weights))
            {
                try
                {
                    var weights = JsonSerializer.Deserialize<List<double>>(averageMemory.Weights);
                    if (weights == null)
                    {
                        await context.DisposeAsync();
                        return (false, "Weights JSON is invalid");
                    }

                    if (weights.Count != inputIds.Count)
                    {
                        await context.DisposeAsync();
                        return (false, $"Weights array length ({weights.Count}) must match InputItemIds length ({inputIds.Count})");
                    }

                    if (weights.Any(w => w <= 0))
                    {
                        await context.DisposeAsync();
                        return (false, "All weights must be positive numbers");
                    }
                }
                catch (Exception ex)
                {
                    await context.DisposeAsync();
                    return (false, $"Invalid Weights JSON format: {ex.Message}");
                }
            }

            // Validate interval
            if (averageMemory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, "Interval must be greater than 0");
            }

            // Validate stale timeout
            if (averageMemory.StaleTimeout <= 0)
            {
                await context.DisposeAsync();
                return (false, "StaleTimeout must be greater than 0");
            }

            // Validate outlier threshold
            if (averageMemory.OutlierThreshold <= 0)
            {
                await context.DisposeAsync();
                return (false, "OutlierThreshold must be greater than 0");
            }

            // Validate minimum inputs
            if (averageMemory.MinimumInputs < 1)
            {
                await context.DisposeAsync();
                return (false, "MinimumInputs must be at least 1");
            }

            if (averageMemory.MinimumInputs > inputIds.Count)
            {
                await context.DisposeAsync();
                return (false, $"MinimumInputs ({averageMemory.MinimumInputs}) cannot exceed number of input items ({inputIds.Count})");
            }

            // Validate moving average parameters
            if (averageMemory.WindowSize < 2 || averageMemory.WindowSize > 1000)
            {
                await context.DisposeAsync();
                return (false, "WindowSize must be between 2 and 1000");
            }

            if (averageMemory.Alpha < 0.01 || averageMemory.Alpha > 1.0)
            {
                await context.DisposeAsync();
                return (false, "Alpha must be between 0.01 and 1.0");
            }

            context.AverageMemories.Update(averageMemory);
            await context.SaveChangesAsync();
            await context.DisposeAsync();
            return (true, null);
        }
        catch (Exception e)
        {
            MyLog.LogJson(e);
            return (false, e.Message);
        }
    }

    /// <summary>
    /// Delete an average memory configuration
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> DeleteAverageMemory(Guid id)
    {
        try
        {
            var context = new DataContext();
            var averageMemory = await context.AverageMemories.FindAsync(id);
            
            if (averageMemory == null)
            {
                await context.DisposeAsync();
                return (false, "Average memory not found");
            }

            context.AverageMemories.Remove(averageMemory);
            await context.SaveChangesAsync();
            await context.DisposeAsync();
            return (true, null);
        }
        catch (Exception e)
        {
            MyLog.LogJson(e);
            return (false, e.Message);
        }
    }
}
