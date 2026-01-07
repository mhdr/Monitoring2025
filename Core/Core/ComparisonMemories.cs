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

                // Support backward compatibility: use InputReferences if present, otherwise use InputItemIds
                var inputReferences = group.InputReferences.Count > 0 ? group.InputReferences : group.InputItemIds;

                // Validate input items exist and match the comparison mode
                if (inputReferences.Count == 0)
                {
                    await context.DisposeAsync();
                    return (false, null, $"{groupLabel}: Must have at least one input item");
                }

                // Validate inputs based on InputType
                if (group.InputType == ComparisonSourceType.Point)
                {
                    foreach (var inputIdStr in inputReferences)
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
                }
                else if (group.InputType == ComparisonSourceType.GlobalVariable)
                {
                    foreach (var inputName in inputReferences)
                    {
                        var inputVariable = await GlobalVariables.GetGlobalVariableByName(inputName);
                        if (inputVariable == null)
                        {
                            await context.DisposeAsync();
                            return (false, null, $"{groupLabel}: Input global variable '{inputName}' not found");
                        }

                        if (inputVariable.IsDisabled)
                        {
                            await context.DisposeAsync();
                            return (false, null, $"{groupLabel}: Input global variable '{inputName}' is disabled");
                        }

                        // Validate variable type matches comparison mode
                        if (group.ComparisonMode == ComparisonMode.Analog)
                        {
                            if (inputVariable.VariableType != GlobalVariableType.Float)
                            {
                                await context.DisposeAsync();
                                return (false, null, $"{groupLabel}: Global variable '{inputName}' must be Float type for Analog mode");
                            }
                        }
                        else // Digital mode
                        {
                            if (inputVariable.VariableType != GlobalVariableType.Boolean && inputVariable.VariableType != GlobalVariableType.Float)
                            {
                                await context.DisposeAsync();
                                return (false, null, $"{groupLabel}: Global variable '{inputName}' must be Boolean or Float type for Digital mode");
                            }
                        }
                    }
                }

                // Validate requiredVotes is in valid range
                if (group.RequiredVotes < 1)
                {
                    await context.DisposeAsync();
                    return (false, null, $"{groupLabel}: RequiredVotes must be at least 1");
                }

                if (group.RequiredVotes > inputReferences.Count)
                {
                    await context.DisposeAsync();
                    return (false, null, $"{groupLabel}: RequiredVotes ({group.RequiredVotes}) cannot exceed number of inputs ({inputReferences.Count})");
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
                    if (minVotesToTurnOn > inputReferences.Count)
                    {
                        await context.DisposeAsync();
                        return (false, null, $"{groupLabel}: VotingHysteresis too high - would require {minVotesToTurnOn} votes but only {inputReferences.Count} inputs available");
                    }
                }
            }

            // Validate output source
            // Support backward compatibility: use OutputReference if present, otherwise use OutputItemId
            var outputReference = !string.IsNullOrEmpty(comparisonMemory.OutputReference) 
                ? comparisonMemory.OutputReference 
                : comparisonMemory.OutputItemId.ToString();

            if (comparisonMemory.OutputType == ComparisonSourceType.Point)
            {
                if (!Guid.TryParse(outputReference, out var outputId))
                {
                    await context.DisposeAsync();
                    return (false, null, "Invalid output item GUID");
                }

                var outputItem = await context.MonitoringItems.FindAsync(outputId);
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
            }
            else if (comparisonMemory.OutputType == ComparisonSourceType.GlobalVariable)
            {
                var outputVariable = await GlobalVariables.GetGlobalVariableByName(outputReference);
                if (outputVariable == null)
                {
                    await context.DisposeAsync();
                    return (false, null, "Output global variable not found");
                }

                if (outputVariable.IsDisabled)
                {
                    await context.DisposeAsync();
                    return (false, null, "Output global variable is disabled");
                }
            }

            // Validate output is not in any input items
            var allInputReferences = groups.SelectMany(g => 
                g.InputReferences.Count > 0 ? g.InputReferences : g.InputItemIds
            ).Distinct().ToList();
            
            if (allInputReferences.Contains(outputReference))
            {
                await context.DisposeAsync();
                return (false, null, "Output cannot be in any group's input list");
            }

            // Validate interval
            if (comparisonMemory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, null, "Interval must be greater than 0");
            }

            // Validate duration
            if (comparisonMemory.Duration < 0)
            {
                await context.DisposeAsync();
                return (false, null, "Duration must be greater than or equal to 0");
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

                // Support backward compatibility: use InputReferences if present, otherwise use InputItemIds
                var inputReferences = group.InputReferences.Count > 0 ? group.InputReferences : group.InputItemIds;

                if (inputReferences.Count == 0)
                {
                    await context.DisposeAsync();
                    return (false, $"{groupLabel}: Must have at least one input item");
                }

                // Validate inputs based on InputType
                if (group.InputType == ComparisonSourceType.Point)
                {
                    foreach (var inputIdStr in inputReferences)
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
                }
                else if (group.InputType == ComparisonSourceType.GlobalVariable)
                {
                    foreach (var inputName in inputReferences)
                    {
                        var inputVariable = await GlobalVariables.GetGlobalVariableByName(inputName);
                        if (inputVariable == null)
                        {
                            await context.DisposeAsync();
                            return (false, $"{groupLabel}: Input global variable '{inputName}' not found");
                        }

                        if (inputVariable.IsDisabled)
                        {
                            await context.DisposeAsync();
                            return (false, $"{groupLabel}: Input global variable '{inputName}' is disabled");
                        }

                        // Validate variable type matches comparison mode
                        if (group.ComparisonMode == ComparisonMode.Analog)
                        {
                            if (inputVariable.VariableType != GlobalVariableType.Float)
                            {
                                await context.DisposeAsync();
                                return (false, $"{groupLabel}: Global variable '{inputName}' must be Float type for Analog mode");
                            }
                        }
                        else // Digital mode
                        {
                            if (inputVariable.VariableType != GlobalVariableType.Boolean && inputVariable.VariableType != GlobalVariableType.Float)
                            {
                                await context.DisposeAsync();
                                return (false, $"{groupLabel}: Global variable '{inputName}' must be Boolean or Float type for Digital mode");
                            }
                        }
                    }
                }

                if (group.RequiredVotes < 1)
                {
                    await context.DisposeAsync();
                    return (false, $"{groupLabel}: RequiredVotes must be at least 1");
                }

                if (group.RequiredVotes > inputReferences.Count)
                {
                    await context.DisposeAsync();
                    return (false, $"{groupLabel}: RequiredVotes ({group.RequiredVotes}) cannot exceed number of inputs ({inputReferences.Count})");
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
                    if (minVotesToTurnOn > inputReferences.Count)
                    {
                        await context.DisposeAsync();
                        return (false, $"{groupLabel}: VotingHysteresis too high - would require {minVotesToTurnOn} votes but only {inputReferences.Count} inputs available");
                    }
                }
            }

            // Validate output source
            // Support backward compatibility: use OutputReference if present, otherwise use OutputItemId
            var outputReference = !string.IsNullOrEmpty(comparisonMemory.OutputReference) 
                ? comparisonMemory.OutputReference 
                : comparisonMemory.OutputItemId.ToString();

            if (comparisonMemory.OutputType == ComparisonSourceType.Point)
            {
                if (!Guid.TryParse(outputReference, out var outputId))
                {
                    await context.DisposeAsync();
                    return (false, "Invalid output item GUID");
                }

                var outputItem = await context.MonitoringItems.FindAsync(outputId);
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
            }
            else if (comparisonMemory.OutputType == ComparisonSourceType.GlobalVariable)
            {
                var outputVariable = await GlobalVariables.GetGlobalVariableByName(outputReference);
                if (outputVariable == null)
                {
                    await context.DisposeAsync();
                    return (false, "Output global variable not found");
                }

                if (outputVariable.IsDisabled)
                {
                    await context.DisposeAsync();
                    return (false, "Output global variable is disabled");
                }
            }

            var allInputReferences = groups.SelectMany(g => 
                g.InputReferences.Count > 0 ? g.InputReferences : g.InputItemIds
            ).Distinct().ToList();
            
            if (allInputReferences.Contains(outputReference))
            {
                await context.DisposeAsync();
                return (false, "Output cannot be in any group's input list");
            }

            if (comparisonMemory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, "Interval must be greater than 0");
            }

            // Validate duration
            if (comparisonMemory.Duration < 0)
            {
                await context.DisposeAsync();
                return (false, "Duration must be greater than or equal to 0");
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
