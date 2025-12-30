using System.Linq.Expressions;
using System.Text.Json;
using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Helper class for ComparisonMemory CRUD operations
/// </summary>
public class ComparisonMemories
{
    /// <summary>
    /// Get all comparison memory configurations
    /// </summary>
    public static async Task<List<ComparisonMemory>?> GetComparisonMemories()
    {
        var context = new DataContext();
        var found = await context.ComparisonMemories.ToListAsync();
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Get a specific comparison memory by predicate
    /// </summary>
    public static async Task<ComparisonMemory?> GetComparisonMemory(Expression<Func<ComparisonMemory, bool>> predicate)
    {
        var context = new DataContext();
        var found = await context.ComparisonMemories.FirstOrDefaultAsync(predicate);
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Add a new comparison memory configuration
    /// </summary>
    public static async Task<(bool Success, Guid? Id, string? ErrorMessage)> AddComparisonMemory(ComparisonMemory comparisonMemory)
    {
        try
        {
            var context = new DataContext();

            // Validate and parse ComparisonGroups JSON
            List<ComparisonGroup> groups;
            try
            {
                groups = JsonSerializer.Deserialize<List<ComparisonGroup>>(comparisonMemory.ComparisonGroups) 
                    ?? new List<ComparisonGroup>();
                
                if (groups.Count == 0)
                {
                    await context.DisposeAsync();
                    return (false, null, "ComparisonGroups must contain at least one group");
                }
            }
            catch (Exception ex)
            {
                await context.DisposeAsync();
                return (false, null, $"Invalid ComparisonGroups JSON format: {ex.Message}");
            }

            // Validate each group
            for (int i = 0; i < groups.Count; i++)
            {
                var group = groups[i];
                var groupLabel = string.IsNullOrEmpty(group.Name) ? $"Group {i + 1}" : group.Name;

                // Validate input items exist and match the comparison mode
                if (group.InputItemIds.Count == 0)
                {
                    await context.DisposeAsync();
                    return (false, null, $"{groupLabel}: Must have at least one input item");
                }

                foreach (var inputIdStr in group.InputItemIds)
                {
                    if (!Guid.TryParse(inputIdStr, out var inputId))
                    {
                        await context.DisposeAsync();
                        return (false, null, $"{groupLabel}: Invalid input item ID format: {inputIdStr}");
                    }

                    var inputItem = await context.MonitoringItems.FindAsync(inputId);
                    if (inputItem == null)
                    {
                        await context.DisposeAsync();
                        return (false, null, $"{groupLabel}: Input item {inputIdStr} not found");
                    }

                    // Validate input type matches comparison mode
                    if (group.ComparisonMode == ComparisonMode.Analog)
                    {
                        if (inputItem.ItemType != ItemType.AnalogInput && inputItem.ItemType != ItemType.AnalogOutput)
                        {
                            await context.DisposeAsync();
                            return (false, null, $"{groupLabel}: Input item {inputIdStr} must be AnalogInput or AnalogOutput for Analog mode");
                        }
                    }
                    else // Digital mode
                    {
                        if (inputItem.ItemType != ItemType.DigitalInput && inputItem.ItemType != ItemType.DigitalOutput)
                        {
                            await context.DisposeAsync();
                            return (false, null, $"{groupLabel}: Input item {inputIdStr} must be DigitalInput or DigitalOutput for Digital mode");
                        }
                    }
                }

                // Validate requiredVotes is in valid range
                if (group.RequiredVotes < 1)
                {
                    await context.DisposeAsync();
                    return (false, null, $"{groupLabel}: RequiredVotes must be at least 1");
                }

                if (group.RequiredVotes > group.InputItemIds.Count)
                {
                    await context.DisposeAsync();
                    return (false, null, $"{groupLabel}: RequiredVotes ({group.RequiredVotes}) cannot exceed number of inputs ({group.InputItemIds.Count})");
                }

                // Validate analog thresholds
                if (group.ComparisonMode == ComparisonMode.Analog)
                {
                    if (!group.Threshold1.HasValue)
                    {
                        await context.DisposeAsync();
                        return (false, null, $"{groupLabel}: Threshold1 is required for Analog mode");
                    }

                    if (group.CompareType == (int)CompareType.Between && !group.Threshold2.HasValue)
                    {
                        await context.DisposeAsync();
                        return (false, null, $"{groupLabel}: Threshold2 is required for Between comparison");
                    }

                    if (group.ThresholdHysteresis < 0)
                    {
                        await context.DisposeAsync();
                        return (false, null, $"{groupLabel}: ThresholdHysteresis must be non-negative");
                    }
                }

                // Validate digital value
                if (group.ComparisonMode == ComparisonMode.Digital)
                {
                    if (string.IsNullOrEmpty(group.DigitalValue) || (group.DigitalValue != "0" && group.DigitalValue != "1"))
                    {
                        await context.DisposeAsync();
                        return (false, null, $"{groupLabel}: DigitalValue must be '0' or '1' for Digital mode");
                    }
                }

                // Validate voting hysteresis
                if (group.VotingHysteresis < 0)
                {
                    await context.DisposeAsync();
                    return (false, null, $"{groupLabel}: VotingHysteresis must be non-negative");
                }

                // Validate voting hysteresis doesn't make condition impossible
                if (group.VotingHysteresis > 0)
                {
                    var minVotesToTurnOn = group.RequiredVotes + group.VotingHysteresis;
                    if (minVotesToTurnOn > group.InputItemIds.Count)
                    {
                        await context.DisposeAsync();
                        return (false, null, $"{groupLabel}: VotingHysteresis too high - would require {minVotesToTurnOn} votes but only {group.InputItemIds.Count} inputs available");
                    }
                }
            }

            // Validate output item exists
            var outputItem = await context.MonitoringItems.FindAsync(comparisonMemory.OutputItemId);
            if (outputItem == null)
            {
                await context.DisposeAsync();
                return (false, null, "Output item not found");
            }

            // Validate output item is DigitalOutput
            if (outputItem.ItemType != ItemType.DigitalOutput)
            {
                await context.DisposeAsync();
                return (false, null, "Output item must be DigitalOutput");
            }

            // Validate output item is not in any input items
            var allInputIds = groups.SelectMany(g => g.InputItemIds).Distinct().ToList();
            if (allInputIds.Contains(comparisonMemory.OutputItemId.ToString()))
            {
                await context.DisposeAsync();
                return (false, null, "Output item cannot be in any group's input items list");
            }

            // Validate interval
            if (comparisonMemory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, null, "Interval must be greater than 0");
            }

            context.ComparisonMemories.Add(comparisonMemory);
            await context.SaveChangesAsync();
            var id = comparisonMemory.Id;
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
    /// Edit an existing comparison memory configuration
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> EditComparisonMemory(ComparisonMemory comparisonMemory)
    {
        try
        {
            var context = new DataContext();

            // Validate comparison memory exists
            var existing = await context.ComparisonMemories.FindAsync(comparisonMemory.Id);
            if (existing == null)
            {
                await context.DisposeAsync();
                return (false, "Comparison memory not found");
            }

            // Validate and parse ComparisonGroups JSON
            List<ComparisonGroup> groups;
            try
            {
                groups = JsonSerializer.Deserialize<List<ComparisonGroup>>(comparisonMemory.ComparisonGroups) 
                    ?? new List<ComparisonGroup>();
                
                if (groups.Count == 0)
                {
                    await context.DisposeAsync();
                    return (false, "ComparisonGroups must contain at least one group");
                }
            }
            catch (Exception ex)
            {
                await context.DisposeAsync();
                return (false, $"Invalid ComparisonGroups JSON format: {ex.Message}");
            }

            // Validate each group (same as AddComparisonMemory)
            for (int i = 0; i < groups.Count; i++)
            {
                var group = groups[i];
                var groupLabel = string.IsNullOrEmpty(group.Name) ? $"Group {i + 1}" : group.Name;

                if (group.InputItemIds.Count == 0)
                {
                    await context.DisposeAsync();
                    return (false, $"{groupLabel}: Must have at least one input item");
                }

                foreach (var inputIdStr in group.InputItemIds)
                {
                    if (!Guid.TryParse(inputIdStr, out var inputId))
                    {
                        await context.DisposeAsync();
                        return (false, $"{groupLabel}: Invalid input item ID format: {inputIdStr}");
                    }

                    var inputItem = await context.MonitoringItems.FindAsync(inputId);
                    if (inputItem == null)
                    {
                        await context.DisposeAsync();
                        return (false, $"{groupLabel}: Input item {inputIdStr} not found");
                    }

                    if (group.ComparisonMode == ComparisonMode.Analog)
                    {
                        if (inputItem.ItemType != ItemType.AnalogInput && inputItem.ItemType != ItemType.AnalogOutput)
                        {
                            await context.DisposeAsync();
                            return (false, $"{groupLabel}: Input item {inputIdStr} must be AnalogInput or AnalogOutput for Analog mode");
                        }
                    }
                    else
                    {
                        if (inputItem.ItemType != ItemType.DigitalInput && inputItem.ItemType != ItemType.DigitalOutput)
                        {
                            await context.DisposeAsync();
                            return (false, $"{groupLabel}: Input item {inputIdStr} must be DigitalInput or DigitalOutput for Digital mode");
                        }
                    }
                }

                if (group.RequiredVotes < 1)
                {
                    await context.DisposeAsync();
                    return (false, $"{groupLabel}: RequiredVotes must be at least 1");
                }

                if (group.RequiredVotes > group.InputItemIds.Count)
                {
                    await context.DisposeAsync();
                    return (false, $"{groupLabel}: RequiredVotes ({group.RequiredVotes}) cannot exceed number of inputs ({group.InputItemIds.Count})");
                }

                if (group.ComparisonMode == ComparisonMode.Analog)
                {
                    if (!group.Threshold1.HasValue)
                    {
                        await context.DisposeAsync();
                        return (false, $"{groupLabel}: Threshold1 is required for Analog mode");
                    }

                    if (group.CompareType == (int)CompareType.Between && !group.Threshold2.HasValue)
                    {
                        await context.DisposeAsync();
                        return (false, $"{groupLabel}: Threshold2 is required for Between comparison");
                    }

                    if (group.ThresholdHysteresis < 0)
                    {
                        await context.DisposeAsync();
                        return (false, $"{groupLabel}: ThresholdHysteresis must be non-negative");
                    }
                }

                if (group.ComparisonMode == ComparisonMode.Digital)
                {
                    if (string.IsNullOrEmpty(group.DigitalValue) || (group.DigitalValue != "0" && group.DigitalValue != "1"))
                    {
                        await context.DisposeAsync();
                        return (false, $"{groupLabel}: DigitalValue must be '0' or '1' for Digital mode");
                    }
                }

                if (group.VotingHysteresis < 0)
                {
                    await context.DisposeAsync();
                    return (false, $"{groupLabel}: VotingHysteresis must be non-negative");
                }

                if (group.VotingHysteresis > 0)
                {
                    var minVotesToTurnOn = group.RequiredVotes + group.VotingHysteresis;
                    if (minVotesToTurnOn > group.InputItemIds.Count)
                    {
                        await context.DisposeAsync();
                        return (false, $"{groupLabel}: VotingHysteresis too high - would require {minVotesToTurnOn} votes but only {group.InputItemIds.Count} inputs available");
                    }
                }
            }

            var outputItem = await context.MonitoringItems.FindAsync(comparisonMemory.OutputItemId);
            if (outputItem == null)
            {
                await context.DisposeAsync();
                return (false, "Output item not found");
            }

            if (outputItem.ItemType != ItemType.DigitalOutput)
            {
                await context.DisposeAsync();
                return (false, "Output item must be DigitalOutput");
            }

            var allInputIds = groups.SelectMany(g => g.InputItemIds).Distinct().ToList();
            if (allInputIds.Contains(comparisonMemory.OutputItemId.ToString()))
            {
                await context.DisposeAsync();
                return (false, "Output item cannot be in any group's input items list");
            }

            if (comparisonMemory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, "Interval must be greater than 0");
            }

            // Update entity
            context.Entry(existing).CurrentValues.SetValues(comparisonMemory);
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
    /// Delete a comparison memory configuration
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> DeleteComparisonMemory(Guid id)
    {
        try
        {
            var context = new DataContext();

            var comparisonMemory = await context.ComparisonMemories.FindAsync(id);
            if (comparisonMemory == null)
            {
                await context.DisposeAsync();
                return (false, "Comparison memory not found");
            }

            context.ComparisonMemories.Remove(comparisonMemory);
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
