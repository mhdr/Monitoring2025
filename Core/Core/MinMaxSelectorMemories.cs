using System.Linq.Expressions;
using System.Text.Json;
using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Helper class for MinMaxSelectorMemory CRUD operations
/// </summary>
public class MinMaxSelectorMemories
{
    /// <summary>
    /// Get all min/max selector memory configurations
    /// </summary>
    public static async Task<List<MinMaxSelectorMemory>?> GetMinMaxSelectorMemories()
    {
        var context = new DataContext();
        var found = await context.MinMaxSelectorMemories.ToListAsync();
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Get a specific min/max selector memory by predicate
    /// </summary>
    public static async Task<MinMaxSelectorMemory?> GetMinMaxSelectorMemory(Expression<Func<MinMaxSelectorMemory, bool>> predicate)
    {
        var context = new DataContext();
        var found = await context.MinMaxSelectorMemories.FirstOrDefaultAsync(predicate);
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Add a new min/max selector memory configuration
    /// </summary>
    public static async Task<(bool Success, Guid? Id, string? ErrorMessage)> AddMinMaxSelectorMemory(MinMaxSelectorMemory memory)
    {
        try
        {
            var context = new DataContext();

            // Parse and validate input item IDs
            List<string>? inputIds;
            try
            {
                inputIds = JsonSerializer.Deserialize<List<string>>(memory.InputItemIds);
            }
            catch (JsonException ex)
            {
                await context.DisposeAsync();
                return (false, null, $"Invalid InputItemIds JSON format: {ex.Message}");
            }

            if (inputIds == null || inputIds.Count < MinMaxSelectorMemory.MinInputCount)
            {
                await context.DisposeAsync();
                return (false, null, $"At least {MinMaxSelectorMemory.MinInputCount} input items are required");
            }

            if (inputIds.Count > MinMaxSelectorMemory.MaxInputCount)
            {
                await context.DisposeAsync();
                return (false, null, $"Maximum {MinMaxSelectorMemory.MaxInputCount} input items are allowed");
            }

            // Track used item IDs to prevent duplicates
            var usedItemIds = new HashSet<Guid>();

            // Validate each input item
            for (int i = 0; i < inputIds.Count; i++)
            {
                if (!Guid.TryParse(inputIds[i], out var inputGuid))
                {
                    await context.DisposeAsync();
                    return (false, null, $"Input {i + 1}: Invalid GUID format");
                }

                if (usedItemIds.Contains(inputGuid))
                {
                    await context.DisposeAsync();
                    return (false, null, $"Input {i + 1}: Duplicate input item not allowed");
                }
                usedItemIds.Add(inputGuid);

                var inputItem = await context.MonitoringItems.FindAsync(inputGuid);
                if (inputItem == null)
                {
                    await context.DisposeAsync();
                    return (false, null, $"Input {i + 1}: Item not found");
                }

                if (inputItem.ItemType != ItemType.AnalogInput && inputItem.ItemType != ItemType.AnalogOutput)
                {
                    await context.DisposeAsync();
                    return (false, null, $"Input {i + 1}: Item must be AnalogInput or AnalogOutput");
                }
            }

            // Validate output item
            if (memory.OutputType == Models.MinMaxSourceType.Point)
            {
                if (!Guid.TryParse(memory.OutputReference, out var outputGuid))
                {
                    await context.DisposeAsync();
                    return (false, null, "Invalid output item GUID");
                }

                var outputItem = await context.MonitoringItems.FindAsync(outputGuid);
                if (outputItem == null)
                {
                    await context.DisposeAsync();
                    return (false, null, "Output item not found");
                }

                if (outputItem.ItemType != ItemType.AnalogOutput)
                {
                    await context.DisposeAsync();
                    return (false, null, "Output item must be AnalogOutput");
                }

                if (usedItemIds.Contains(outputGuid))
                {
                    await context.DisposeAsync();
                    return (false, null, "Output item cannot be the same as an input item");
                }
                usedItemIds.Add(outputGuid);
            }
            else if (memory.OutputType == Models.MinMaxSourceType.GlobalVariable)
            {
                var outputVariable = await GlobalVariables.GetGlobalVariableByName(memory.OutputReference);
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

            // Validate optional selected index output item
            if (memory.SelectedIndexOutputType.HasValue)
            {
                if (memory.SelectedIndexOutputType.Value == Models.MinMaxSourceType.Point)
                {
                    if (string.IsNullOrEmpty(memory.SelectedIndexOutputReference))
                    {
                        await context.DisposeAsync();
                        return (false, null, "Selected index output reference is required when type is Point");
                    }

                    if (!Guid.TryParse(memory.SelectedIndexOutputReference, out var indexOutputGuid))
                    {
                        await context.DisposeAsync();
                        return (false, null, "Invalid selected index output item GUID");
                    }

                    var indexOutputItem = await context.MonitoringItems.FindAsync(indexOutputGuid);
                    if (indexOutputItem == null)
                    {
                        await context.DisposeAsync();
                        return (false, null, "Selected index output item not found");
                    }

                    if (indexOutputItem.ItemType != ItemType.AnalogOutput)
                    {
                        await context.DisposeAsync();
                        return (false, null, "Selected index output item must be AnalogOutput");
                    }

                    if (usedItemIds.Contains(indexOutputGuid))
                    {
                        await context.DisposeAsync();
                        return (false, null, "Selected index output item cannot be the same as input or value output item");
                    }
                }
                else if (memory.SelectedIndexOutputType.Value == Models.MinMaxSourceType.GlobalVariable)
                {
                    if (string.IsNullOrEmpty(memory.SelectedIndexOutputReference))
                    {
                        await context.DisposeAsync();
                        return (false, null, "Selected index output reference is required when type is GlobalVariable");
                    }

                    var indexOutputVariable = await GlobalVariables.GetGlobalVariableByName(memory.SelectedIndexOutputReference);
                    if (indexOutputVariable == null)
                    {
                        await context.DisposeAsync();
                        return (false, null, "Selected index output global variable not found");
                    }
                    
                    if (indexOutputVariable.IsDisabled)
                    {
                        await context.DisposeAsync();
                        return (false, null, "Selected index output global variable is disabled");
                    }
                }
            }

            // Validate interval
            if (memory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, null, "Interval must be greater than 0");
            }

            // Validate selection mode
            if (!Enum.IsDefined(typeof(MinMaxSelectionMode), memory.SelectionMode))
            {
                await context.DisposeAsync();
                return (false, null, "Invalid selection mode");
            }

            // Validate failover mode
            if (!Enum.IsDefined(typeof(MinMaxFailoverMode), memory.FailoverMode))
            {
                await context.DisposeAsync();
                return (false, null, "Invalid failover mode");
            }

            // Validate duration
            if (memory.Duration < 0)
            {
                await context.DisposeAsync();
                return (false, null, "Duration must be greater than or equal to 0");
            }

            context.MinMaxSelectorMemories.Add(memory);
            await context.SaveChangesAsync();
            var id = memory.Id;
            await context.DisposeAsync();
            
            // Invalidate usage cache for referenced global variables
            await GlobalVariableUsageCache.OnMemoryChanged(id, "MinMaxSelectorMemory");
            
            return (true, id, null);
        }
        catch (Exception e)
        {
            MyLog.LogJson(e);
            return (false, null, e.Message);
        }
    }

    /// <summary>
    /// Edit an existing min/max selector memory configuration
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> EditMinMaxSelectorMemory(MinMaxSelectorMemory memory)
    {
        try
        {
            var context = new DataContext();

            // Validate memory exists
            var existing = await context.MinMaxSelectorMemories.AsNoTracking().FirstOrDefaultAsync(m => m.Id == memory.Id);
            if (existing == null)
            {
                await context.DisposeAsync();
                return (false, "Min/Max selector memory not found");
            }

            // Parse and validate input item IDs
            List<string>? inputIds;
            try
            {
                inputIds = JsonSerializer.Deserialize<List<string>>(memory.InputItemIds);
            }
            catch (JsonException ex)
            {
                await context.DisposeAsync();
                return (false, $"Invalid InputItemIds JSON format: {ex.Message}");
            }

            if (inputIds == null || inputIds.Count < MinMaxSelectorMemory.MinInputCount)
            {
                await context.DisposeAsync();
                return (false, $"At least {MinMaxSelectorMemory.MinInputCount} input items are required");
            }

            if (inputIds.Count > MinMaxSelectorMemory.MaxInputCount)
            {
                await context.DisposeAsync();
                return (false, $"Maximum {MinMaxSelectorMemory.MaxInputCount} input items are allowed");
            }

            // Track used item IDs to prevent duplicates
            var usedItemIds = new HashSet<Guid>();

            // Validate each input item
            for (int i = 0; i < inputIds.Count; i++)
            {
                if (!Guid.TryParse(inputIds[i], out var inputGuid))
                {
                    await context.DisposeAsync();
                    return (false, $"Input {i + 1}: Invalid GUID format");
                }

                if (usedItemIds.Contains(inputGuid))
                {
                    await context.DisposeAsync();
                    return (false, $"Input {i + 1}: Duplicate input item not allowed");
                }
                usedItemIds.Add(inputGuid);

                var inputItem = await context.MonitoringItems.FindAsync(inputGuid);
                if (inputItem == null)
                {
                    await context.DisposeAsync();
                    return (false, $"Input {i + 1}: Item not found");
                }

                if (inputItem.ItemType != ItemType.AnalogInput && inputItem.ItemType != ItemType.AnalogOutput)
                {
                    await context.DisposeAsync();
                    return (false, $"Input {i + 1}: Item must be AnalogInput or AnalogOutput");
                }
            }

            // Validate output item
            if (memory.OutputType == Models.MinMaxSourceType.Point)
            {
                if (!Guid.TryParse(memory.OutputReference, out var outputGuid))
                {
                    await context.DisposeAsync();
                    return (false, "Invalid output item GUID");
                }

                var outputItem = await context.MonitoringItems.FindAsync(outputGuid);
                if (outputItem == null)
                {
                    await context.DisposeAsync();
                    return (false, "Output item not found");
                }

                if (outputItem.ItemType != ItemType.AnalogOutput)
                {
                    await context.DisposeAsync();
                    return (false, "Output item must be AnalogOutput");
                }

                if (usedItemIds.Contains(outputGuid))
                {
                    await context.DisposeAsync();
                    return (false, "Output item cannot be the same as an input item");
                }
                usedItemIds.Add(outputGuid);
            }
            else if (memory.OutputType == Models.MinMaxSourceType.GlobalVariable)
            {
                var outputVariable = await GlobalVariables.GetGlobalVariableByName(memory.OutputReference);
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

            // Validate optional selected index output item
            if (memory.SelectedIndexOutputType.HasValue)
            {
                if (memory.SelectedIndexOutputType.Value == Models.MinMaxSourceType.Point)
                {
                    if (string.IsNullOrEmpty(memory.SelectedIndexOutputReference))
                    {
                        await context.DisposeAsync();
                        return (false, "Selected index output reference is required when type is Point");
                    }

                    if (!Guid.TryParse(memory.SelectedIndexOutputReference, out var indexOutputGuid))
                    {
                        await context.DisposeAsync();
                        return (false, "Invalid selected index output item GUID");
                    }

                    var indexOutputItem = await context.MonitoringItems.FindAsync(indexOutputGuid);
                    if (indexOutputItem == null)
                    {
                        await context.DisposeAsync();
                        return (false, "Selected index output item not found");
                    }

                    if (indexOutputItem.ItemType != ItemType.AnalogOutput)
                    {
                        await context.DisposeAsync();
                        return (false, "Selected index output item must be AnalogOutput");
                    }

                    if (usedItemIds.Contains(indexOutputGuid))
                    {
                        await context.DisposeAsync();
                        return (false, "Selected index output item cannot be the same as input or value output item");
                    }
                }
                else if (memory.SelectedIndexOutputType.Value == Models.MinMaxSourceType.GlobalVariable)
                {
                    if (string.IsNullOrEmpty(memory.SelectedIndexOutputReference))
                    {
                        await context.DisposeAsync();
                        return (false, "Selected index output reference is required when type is GlobalVariable");
                    }

                    var indexOutputVariable = await GlobalVariables.GetGlobalVariableByName(memory.SelectedIndexOutputReference);
                    if (indexOutputVariable == null)
                    {
                        await context.DisposeAsync();
                        return (false, "Selected index output global variable not found");
                    }
                    
                    if (indexOutputVariable.IsDisabled)
                    {
                        await context.DisposeAsync();
                        return (false, "Selected index output global variable is disabled");
                    }
                }
            }

            // Validate interval
            if (memory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, "Interval must be greater than 0");
            }

            // Validate selection mode
            if (!Enum.IsDefined(typeof(MinMaxSelectionMode), memory.SelectionMode))
            {
                await context.DisposeAsync();
                return (false, "Invalid selection mode");
            }

            // Validate failover mode
            if (!Enum.IsDefined(typeof(MinMaxFailoverMode), memory.FailoverMode))
            {
                await context.DisposeAsync();
                return (false, "Invalid failover mode");
            }

            // Validate duration
            if (memory.Duration < 0)
            {
                await context.DisposeAsync();
                return (false, "Duration must be greater than or equal to 0");
            }

            // Reset last selected values if configuration changed significantly
            if (existing.InputItemIds != memory.InputItemIds ||
                existing.SelectionMode != memory.SelectionMode)
            {
                memory.LastSelectedIndex = null;
                memory.LastSelectedValue = null;
            }

            context.MinMaxSelectorMemories.Update(memory);
            await context.SaveChangesAsync();
            await context.DisposeAsync();
            
            // Invalidate usage cache for referenced global variables
            await GlobalVariableUsageCache.OnMemoryChanged(memory.Id, "MinMaxSelectorMemory");
            
            return (true, null);
        }
        catch (Exception e)
        {
            MyLog.LogJson(e);
            return (false, e.Message);
        }
    }

    /// <summary>
    /// Delete a min/max selector memory configuration
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> DeleteMinMaxSelectorMemory(Guid id)
    {
        try
        {
            var context = new DataContext();
            var memory = await context.MinMaxSelectorMemories.FindAsync(id);
            
            if (memory == null)
            {
                await context.DisposeAsync();
                return (false, "Min/Max selector memory not found");
            }

            // Invalidate usage cache for referenced global variables (before deletion)
            await GlobalVariableUsageCache.OnMemoryChanged(id, "MinMaxSelectorMemory");

            context.MinMaxSelectorMemories.Remove(memory);
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
    /// Reset a min/max selector memory (clear last selected state)
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> ResetMinMaxSelectorMemory(Guid id)
    {
        try
        {
            var context = new DataContext();
            var memory = await context.MinMaxSelectorMemories.FindAsync(id);
            
            if (memory == null)
            {
                await context.DisposeAsync();
                return (false, "Min/Max selector memory not found");
            }

            // Reset runtime state
            memory.LastSelectedIndex = null;
            memory.LastSelectedValue = null;

            context.MinMaxSelectorMemories.Update(memory);
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
