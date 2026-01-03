using System.Linq.Expressions;
using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Helper class for TimeoutMemory CRUD operations
/// </summary>
public class TimeoutMemories
{
    /// <summary>
    /// Get all timeout memory configurations
    /// </summary>
    public static async Task<List<TimeoutMemory>?> GetTimeoutMemories()
    {
        var context = new DataContext();
        var found = await context.TimeoutMemories.ToListAsync();
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Get a specific timeout memory by predicate
    /// </summary>
    public static async Task<TimeoutMemory?> GetTimeoutMemory(Expression<Func<TimeoutMemory, bool>> predicate)
    {
        var context = new DataContext();
        var found = await context.TimeoutMemories.FirstOrDefaultAsync(predicate);
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Add a new timeout memory configuration
    /// </summary>
    public static async Task<(bool Success, Guid? Id, string? ErrorMessage)> AddTimeoutMemory(TimeoutMemory timeoutMemory)
    {
        try
        {
            var context = new DataContext();
            
            // Validate Input source
            if (timeoutMemory.InputType == Models.TimeoutSourceType.Point)
            {
                if (!Guid.TryParse(timeoutMemory.InputReference, out var inputItemId))
                {
                    await context.DisposeAsync();
                    return (false, null, "Invalid input item GUID");
                }
                
                var inputItem = await context.MonitoringItems.FindAsync(inputItemId);
                if (inputItem == null)
                {
                    await context.DisposeAsync();
                    return (false, null, "Input item not found");
                }
            }
            else if (timeoutMemory.InputType == Models.TimeoutSourceType.GlobalVariable)
            {
                var inputVariable = await GlobalVariables.GetGlobalVariableByName(timeoutMemory.InputReference);
                if (inputVariable == null)
                {
                    await context.DisposeAsync();
                    return (false, null, "Input global variable not found");
                }
                
                if (inputVariable.IsDisabled)
                {
                    await context.DisposeAsync();
                    return (false, null, "Input global variable is disabled");
                }
            }

            // Validate Output source
            if (timeoutMemory.OutputType == Models.TimeoutSourceType.Point)
            {
                if (!Guid.TryParse(timeoutMemory.OutputReference, out var outputItemId))
                {
                    await context.DisposeAsync();
                    return (false, null, "Invalid output item GUID");
                }
                
                var outputItem = await context.MonitoringItems.FindAsync(outputItemId);
                if (outputItem == null)
                {
                    await context.DisposeAsync();
                    return (false, null, "Output item not found");
                }

                // Validate OutputItem is DigitalOutput
                if (outputItem.ItemType != ItemType.DigitalOutput)
                {
                    await context.DisposeAsync();
                    return (false, null, "Output item must be DigitalOutput");
                }
            }
            else if (timeoutMemory.OutputType == Models.TimeoutSourceType.GlobalVariable)
            {
                var outputVariable = await GlobalVariables.GetGlobalVariableByName(timeoutMemory.OutputReference);
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

            // Validate Input != Output (same type and reference)
            if (timeoutMemory.InputType == timeoutMemory.OutputType && 
                timeoutMemory.InputReference == timeoutMemory.OutputReference)
            {
                await context.DisposeAsync();
                return (false, null, "Input and output sources must be different");
            }

            context.TimeoutMemories.Add(timeoutMemory);
            await context.SaveChangesAsync();
            var id = timeoutMemory.Id;
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
    /// Edit an existing timeout memory configuration
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> EditTimeoutMemory(TimeoutMemory timeoutMemory)
    {
        try
        {
            var context = new DataContext();

            // Validate timeout memory exists
            var existing = await context.TimeoutMemories.FindAsync(timeoutMemory.Id);
            if (existing == null)
            {
                await context.DisposeAsync();
                return (false, "Timeout memory not found");
            }

            // Validate Input source
            if (timeoutMemory.InputType == Models.TimeoutSourceType.Point)
            {
                if (!Guid.TryParse(timeoutMemory.InputReference, out var inputItemId))
                {
                    await context.DisposeAsync();
                    return (false, "Invalid input item GUID");
                }
                
                var inputItem = await context.MonitoringItems.FindAsync(inputItemId);
                if (inputItem == null)
                {
                    await context.DisposeAsync();
                    return (false, "Input item not found");
                }
            }
            else if (timeoutMemory.InputType == Models.TimeoutSourceType.GlobalVariable)
            {
                var inputVariable = await GlobalVariables.GetGlobalVariableByName(timeoutMemory.InputReference);
                if (inputVariable == null)
                {
                    await context.DisposeAsync();
                    return (false, "Input global variable not found");
                }
                
                if (inputVariable.IsDisabled)
                {
                    await context.DisposeAsync();
                    return (false, "Input global variable is disabled");
                }
            }

            // Validate Output source
            if (timeoutMemory.OutputType == Models.TimeoutSourceType.Point)
            {
                if (!Guid.TryParse(timeoutMemory.OutputReference, out var outputItemId))
                {
                    await context.DisposeAsync();
                    return (false, "Invalid output item GUID");
                }
                
                var outputItem = await context.MonitoringItems.FindAsync(outputItemId);
                if (outputItem == null)
                {
                    await context.DisposeAsync();
                    return (false, "Output item not found");
                }

                // Validate OutputItem is DigitalOutput
                if (outputItem.ItemType != ItemType.DigitalOutput)
                {
                    await context.DisposeAsync();
                    return (false, "Output item must be DigitalOutput");
                }
            }
            else if (timeoutMemory.OutputType == Models.TimeoutSourceType.GlobalVariable)
            {
                var outputVariable = await GlobalVariables.GetGlobalVariableByName(timeoutMemory.OutputReference);
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

            // Validate Input != Output (same type and reference)
            if (timeoutMemory.InputType == timeoutMemory.OutputType && 
                timeoutMemory.InputReference == timeoutMemory.OutputReference)
            {
                await context.DisposeAsync();
                return (false, "Input and output sources must be different");
            }

            context.TimeoutMemories.Update(timeoutMemory);
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
    /// Delete a timeout memory configuration
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> DeleteTimeoutMemory(Guid id)
    {
        try
        {
            var context = new DataContext();
            var timeoutMemory = await context.TimeoutMemories.FindAsync(id);
            
            if (timeoutMemory == null)
            {
                await context.DisposeAsync();
                return (false, "Timeout memory not found");
            }

            context.TimeoutMemories.Remove(timeoutMemory);
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
