using System.Linq.Expressions;
using System.Text.Json;
using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Helper class for StatisticalMemory CRUD operations
/// </summary>
public class StatisticalMemories
{
    /// <summary>
    /// Get all statistical memory configurations
    /// </summary>
    public static async Task<List<StatisticalMemory>?> GetStatisticalMemories()
    {
        var context = new DataContext();
        var found = await context.StatisticalMemories.ToListAsync();
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Get a specific statistical memory by predicate
    /// </summary>
    public static async Task<StatisticalMemory?> GetStatisticalMemory(Expression<Func<StatisticalMemory, bool>> predicate)
    {
        var context = new DataContext();
        var found = await context.StatisticalMemories.FirstOrDefaultAsync(predicate);
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Add a new statistical memory configuration
    /// </summary>
    public static async Task<(bool Success, Guid? Id, string? ErrorMessage)> AddStatisticalMemory(StatisticalMemory statisticalMemory)
    {
        try
        {
            var context = new DataContext();

            // Validate input item exists and is analog type
            var inputItem = await context.MonitoringItems.FindAsync(statisticalMemory.InputItemId);
            if (inputItem == null)
            {
                await context.DisposeAsync();
                return (false, null, "Input item not found");
            }

            if (inputItem.ItemType != ItemType.AnalogInput && inputItem.ItemType != ItemType.AnalogOutput)
            {
                await context.DisposeAsync();
                return (false, null, "Input item must be AnalogInput or AnalogOutput");
            }

            // Collect all output item IDs for validation
            var outputItemIds = new HashSet<Guid>();

            // Validate core output items (all optional)
            var hasAtLeastOneOutput = false;
            
            // Helper to validate an optional output
            async Task<string?> ValidateOptionalOutput(Guid? outputId, string fieldName)
            {
                if (!outputId.HasValue) return null;
                
                hasAtLeastOneOutput = true;
                
                if (outputItemIds.Contains(outputId.Value))
                {
                    return $"{fieldName}: Output item already used for another output";
                }
                outputItemIds.Add(outputId.Value);
                
                if (outputId.Value == statisticalMemory.InputItemId)
                {
                    return $"{fieldName}: Output item cannot be the same as input item";
                }
                
                var item = await context.MonitoringItems.FindAsync(outputId.Value);
                if (item == null)
                {
                    return $"{fieldName}: Output item not found";
                }
                
                if (item.ItemType != ItemType.AnalogOutput)
                {
                    return $"{fieldName}: Output item must be AnalogOutput";
                }
                
                return null;
            }

            // Validate all core outputs
            var error = await ValidateOptionalOutput(statisticalMemory.OutputMinItemId, "Min output");
            if (error != null) { await context.DisposeAsync(); return (false, null, error); }
            
            error = await ValidateOptionalOutput(statisticalMemory.OutputMaxItemId, "Max output");
            if (error != null) { await context.DisposeAsync(); return (false, null, error); }
            
            error = await ValidateOptionalOutput(statisticalMemory.OutputAvgItemId, "Average output");
            if (error != null) { await context.DisposeAsync(); return (false, null, error); }
            
            error = await ValidateOptionalOutput(statisticalMemory.OutputStdDevItemId, "StdDev output");
            if (error != null) { await context.DisposeAsync(); return (false, null, error); }
            
            error = await ValidateOptionalOutput(statisticalMemory.OutputRangeItemId, "Range output");
            if (error != null) { await context.DisposeAsync(); return (false, null, error); }
            
            error = await ValidateOptionalOutput(statisticalMemory.OutputMedianItemId, "Median output");
            if (error != null) { await context.DisposeAsync(); return (false, null, error); }
            
            error = await ValidateOptionalOutput(statisticalMemory.OutputCVItemId, "CV output");
            if (error != null) { await context.DisposeAsync(); return (false, null, error); }

            // Validate and parse PercentilesConfig JSON
            if (!string.IsNullOrWhiteSpace(statisticalMemory.PercentilesConfig) && 
                statisticalMemory.PercentilesConfig != "[]")
            {
                try
                {
                    var percentiles = JsonSerializer.Deserialize<List<PercentileConfig>>(statisticalMemory.PercentilesConfig);
                    if (percentiles != null && percentiles.Count > 0)
                    {
                        hasAtLeastOneOutput = true;
                        var usedPercentiles = new HashSet<double>();
                        
                        foreach (var percentile in percentiles)
                        {
                            // Validate percentile value
                            if (percentile.Percentile < 0 || percentile.Percentile > 100)
                            {
                                await context.DisposeAsync();
                                return (false, null, $"Percentile value must be between 0 and 100. Got: {percentile.Percentile}");
                            }
                            
                            // Check for duplicate percentile values
                            if (usedPercentiles.Contains(percentile.Percentile))
                            {
                                await context.DisposeAsync();
                                return (false, null, $"Duplicate percentile value: {percentile.Percentile}");
                            }
                            usedPercentiles.Add(percentile.Percentile);
                            
                            // Check for duplicate output items
                            if (outputItemIds.Contains(percentile.OutputItemId))
                            {
                                await context.DisposeAsync();
                                return (false, null, $"Percentile {percentile.Percentile}: Output item already used");
                            }
                            outputItemIds.Add(percentile.OutputItemId);
                            
                            // Check not same as input
                            if (percentile.OutputItemId == statisticalMemory.InputItemId)
                            {
                                await context.DisposeAsync();
                                return (false, null, $"Percentile {percentile.Percentile}: Output item cannot be the same as input item");
                            }
                            
                            // Validate output item exists and is analog
                            var item = await context.MonitoringItems.FindAsync(percentile.OutputItemId);
                            if (item == null)
                            {
                                await context.DisposeAsync();
                                return (false, null, $"Percentile {percentile.Percentile}: Output item not found");
                            }
                            
                            if (item.ItemType != ItemType.AnalogOutput)
                            {
                                await context.DisposeAsync();
                                return (false, null, $"Percentile {percentile.Percentile}: Output item must be AnalogOutput");
                            }
                        }
                    }
                }
                catch (JsonException ex)
                {
                    await context.DisposeAsync();
                    return (false, null, $"Invalid PercentilesConfig JSON format: {ex.Message}");
                }
            }

            // Validate at least one output is configured
            if (!hasAtLeastOneOutput)
            {
                await context.DisposeAsync();
                return (false, null, "At least one output (core output or percentile) must be configured");
            }

            // Validate interval
            if (statisticalMemory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, null, "Interval must be greater than 0");
            }

            // Validate window size
            if (statisticalMemory.WindowSize < 10 || statisticalMemory.WindowSize > 10000)
            {
                await context.DisposeAsync();
                return (false, null, "WindowSize must be between 10 and 10000");
            }

            // Validate min samples
            if (statisticalMemory.MinSamples < 2)
            {
                await context.DisposeAsync();
                return (false, null, "MinSamples must be at least 2 (required for standard deviation)");
            }

            if (statisticalMemory.MinSamples > statisticalMemory.WindowSize)
            {
                await context.DisposeAsync();
                return (false, null, $"MinSamples ({statisticalMemory.MinSamples}) cannot exceed WindowSize ({statisticalMemory.WindowSize})");
            }

            // Validate duration
            if (statisticalMemory.Duration < 0)
            {
                await context.DisposeAsync();
                return (false, null, "Duration must be greater than or equal to 0");
            }

            context.StatisticalMemories.Add(statisticalMemory);
            await context.SaveChangesAsync();
            var id = statisticalMemory.Id;
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
    /// Edit an existing statistical memory configuration
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> EditStatisticalMemory(StatisticalMemory statisticalMemory)
    {
        try
        {
            var context = new DataContext();

            // Validate statistical memory exists
            var existing = await context.StatisticalMemories.FindAsync(statisticalMemory.Id);
            if (existing == null)
            {
                await context.DisposeAsync();
                return (false, "Statistical memory not found");
            }

            // Validate input item exists and is analog type
            var inputItem = await context.MonitoringItems.FindAsync(statisticalMemory.InputItemId);
            if (inputItem == null)
            {
                await context.DisposeAsync();
                return (false, "Input item not found");
            }

            if (inputItem.ItemType != ItemType.AnalogInput && inputItem.ItemType != ItemType.AnalogOutput)
            {
                await context.DisposeAsync();
                return (false, "Input item must be AnalogInput or AnalogOutput");
            }

            // Collect all output item IDs for validation
            var outputItemIds = new HashSet<Guid>();

            // Validate core output items (all optional)
            var hasAtLeastOneOutput = false;
            
            // Helper to validate an optional output
            async Task<string?> ValidateOptionalOutput(Guid? outputId, string fieldName)
            {
                if (!outputId.HasValue) return null;
                
                hasAtLeastOneOutput = true;
                
                if (outputItemIds.Contains(outputId.Value))
                {
                    return $"{fieldName}: Output item already used for another output";
                }
                outputItemIds.Add(outputId.Value);
                
                if (outputId.Value == statisticalMemory.InputItemId)
                {
                    return $"{fieldName}: Output item cannot be the same as input item";
                }
                
                var item = await context.MonitoringItems.FindAsync(outputId.Value);
                if (item == null)
                {
                    return $"{fieldName}: Output item not found";
                }
                
                if (item.ItemType != ItemType.AnalogOutput)
                {
                    return $"{fieldName}: Output item must be AnalogOutput";
                }
                
                return null;
            }

            // Validate all core outputs
            var error = await ValidateOptionalOutput(statisticalMemory.OutputMinItemId, "Min output");
            if (error != null) { await context.DisposeAsync(); return (false, error); }
            
            error = await ValidateOptionalOutput(statisticalMemory.OutputMaxItemId, "Max output");
            if (error != null) { await context.DisposeAsync(); return (false, error); }
            
            error = await ValidateOptionalOutput(statisticalMemory.OutputAvgItemId, "Average output");
            if (error != null) { await context.DisposeAsync(); return (false, error); }
            
            error = await ValidateOptionalOutput(statisticalMemory.OutputStdDevItemId, "StdDev output");
            if (error != null) { await context.DisposeAsync(); return (false, error); }
            
            error = await ValidateOptionalOutput(statisticalMemory.OutputRangeItemId, "Range output");
            if (error != null) { await context.DisposeAsync(); return (false, error); }
            
            error = await ValidateOptionalOutput(statisticalMemory.OutputMedianItemId, "Median output");
            if (error != null) { await context.DisposeAsync(); return (false, error); }
            
            error = await ValidateOptionalOutput(statisticalMemory.OutputCVItemId, "CV output");
            if (error != null) { await context.DisposeAsync(); return (false, error); }

            // Validate and parse PercentilesConfig JSON
            if (!string.IsNullOrWhiteSpace(statisticalMemory.PercentilesConfig) && 
                statisticalMemory.PercentilesConfig != "[]")
            {
                try
                {
                    var percentiles = JsonSerializer.Deserialize<List<PercentileConfig>>(statisticalMemory.PercentilesConfig);
                    if (percentiles != null && percentiles.Count > 0)
                    {
                        hasAtLeastOneOutput = true;
                        var usedPercentiles = new HashSet<double>();
                        
                        foreach (var percentile in percentiles)
                        {
                            // Validate percentile value
                            if (percentile.Percentile < 0 || percentile.Percentile > 100)
                            {
                                await context.DisposeAsync();
                                return (false, $"Percentile value must be between 0 and 100. Got: {percentile.Percentile}");
                            }
                            
                            // Check for duplicate percentile values
                            if (usedPercentiles.Contains(percentile.Percentile))
                            {
                                await context.DisposeAsync();
                                return (false, $"Duplicate percentile value: {percentile.Percentile}");
                            }
                            usedPercentiles.Add(percentile.Percentile);
                            
                            // Check for duplicate output items
                            if (outputItemIds.Contains(percentile.OutputItemId))
                            {
                                await context.DisposeAsync();
                                return (false, $"Percentile {percentile.Percentile}: Output item already used");
                            }
                            outputItemIds.Add(percentile.OutputItemId);
                            
                            // Check not same as input
                            if (percentile.OutputItemId == statisticalMemory.InputItemId)
                            {
                                await context.DisposeAsync();
                                return (false, $"Percentile {percentile.Percentile}: Output item cannot be the same as input item");
                            }
                            
                            // Validate output item exists and is analog
                            var item = await context.MonitoringItems.FindAsync(percentile.OutputItemId);
                            if (item == null)
                            {
                                await context.DisposeAsync();
                                return (false, $"Percentile {percentile.Percentile}: Output item not found");
                            }
                            
                            if (item.ItemType != ItemType.AnalogOutput)
                            {
                                await context.DisposeAsync();
                                return (false, $"Percentile {percentile.Percentile}: Output item must be AnalogOutput");
                            }
                        }
                    }
                }
                catch (JsonException ex)
                {
                    await context.DisposeAsync();
                    return (false, $"Invalid PercentilesConfig JSON format: {ex.Message}");
                }
            }

            // Validate at least one output is configured
            if (!hasAtLeastOneOutput)
            {
                await context.DisposeAsync();
                return (false, "At least one output (core output or percentile) must be configured");
            }

            // Validate interval
            if (statisticalMemory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, "Interval must be greater than 0");
            }

            // Validate window size
            if (statisticalMemory.WindowSize < 10 || statisticalMemory.WindowSize > 10000)
            {
                await context.DisposeAsync();
                return (false, "WindowSize must be between 10 and 10000");
            }

            // Validate min samples
            if (statisticalMemory.MinSamples < 2)
            {
                await context.DisposeAsync();
                return (false, "MinSamples must be at least 2 (required for standard deviation)");
            }

            if (statisticalMemory.MinSamples > statisticalMemory.WindowSize)
            {
                await context.DisposeAsync();
                return (false, $"MinSamples ({statisticalMemory.MinSamples}) cannot exceed WindowSize ({statisticalMemory.WindowSize})");
            }

            // Validate duration
            if (statisticalMemory.Duration < 0)
            {
                await context.DisposeAsync();
                return (false, "Duration must be greater than or equal to 0");
            }

            // Clear samples if window type changed (tumbling mode needs reset)
            if (existing.WindowType != statisticalMemory.WindowType || 
                existing.WindowSize != statisticalMemory.WindowSize)
            {
                var samplesToRemove = await context.StatisticalMemorySamples
                    .Where(s => s.StatisticalMemoryId == statisticalMemory.Id)
                    .ToListAsync();
                context.StatisticalMemorySamples.RemoveRange(samplesToRemove);
                statisticalMemory.CurrentBatchCount = 0;
                statisticalMemory.LastResetTime = null;
            }

            context.StatisticalMemories.Update(statisticalMemory);
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
    /// Delete a statistical memory configuration and all its samples
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> DeleteStatisticalMemory(Guid id)
    {
        try
        {
            var context = new DataContext();
            var statisticalMemory = await context.StatisticalMemories.FindAsync(id);
            
            if (statisticalMemory == null)
            {
                await context.DisposeAsync();
                return (false, "Statistical memory not found");
            }

            // Delete related samples first (cascade should handle this, but being explicit)
            var samples = await context.StatisticalMemorySamples
                .Where(s => s.StatisticalMemoryId == id)
                .ToListAsync();
            context.StatisticalMemorySamples.RemoveRange(samples);

            context.StatisticalMemories.Remove(statisticalMemory);
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
    /// Reset a statistical memory (clear all samples and reset counters)
    /// Used for manual reset or triggered reset operations
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> ResetStatisticalMemory(Guid id)
    {
        try
        {
            var context = new DataContext();
            var statisticalMemory = await context.StatisticalMemories.FindAsync(id);
            
            if (statisticalMemory == null)
            {
                await context.DisposeAsync();
                return (false, "Statistical memory not found");
            }

            // Delete all samples
            var samples = await context.StatisticalMemorySamples
                .Where(s => s.StatisticalMemoryId == id)
                .ToListAsync();
            context.StatisticalMemorySamples.RemoveRange(samples);

            // Reset counters
            statisticalMemory.CurrentBatchCount = 0;
            statisticalMemory.LastResetTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

            context.StatisticalMemories.Update(statisticalMemory);
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
