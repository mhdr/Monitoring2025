using System.Linq.Expressions;
using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Helper class for PIDMemory CRUD operations
/// </summary>
public class PIDMemories
{
    /// <summary>
    /// Get all PID memory configurations
    /// </summary>
    public static async Task<List<PIDMemory>?> GetPIDMemories()
    {
        var context = new DataContext();
        var found = await context.PIDMemories.ToListAsync();
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Get a specific PID memory by predicate
    /// </summary>
    public static async Task<PIDMemory?> GetPIDMemory(Expression<Func<PIDMemory, bool>> predicate)
    {
        var context = new DataContext();
        var found = await context.PIDMemories.FirstOrDefaultAsync(predicate);
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Add a new PID memory configuration
    /// </summary>
    public static async Task<(bool Success, Guid? Id, string? ErrorMessage)> AddPIDMemory(PIDMemory pidMemory)
    {
        try
        {
            var context = new DataContext();
            
            // Validate InputItem exists
            var inputItem = await context.MonitoringItems.FindAsync(pidMemory.InputItemId);
            if (inputItem == null)
            {
                await context.DisposeAsync();
                return (false, null, "Input item not found");
            }

            // Validate InputItem is AnalogInput
            if (inputItem.ItemType != ItemType.AnalogInput)
            {
                await context.DisposeAsync();
                return (false, null, "Input item must be AnalogInput");
            }

            // Validate OutputItem exists
            var outputItem = await context.MonitoringItems.FindAsync(pidMemory.OutputItemId);
            if (outputItem == null)
            {
                await context.DisposeAsync();
                return (false, null, "Output item not found");
            }

            // Validate OutputItem is AnalogOutput
            if (outputItem.ItemType != ItemType.AnalogOutput)
            {
                await context.DisposeAsync();
                return (false, null, "Output item must be AnalogOutput");
            }

            // Validate InputItemId != OutputItemId
            if (pidMemory.InputItemId == pidMemory.OutputItemId)
            {
                await context.DisposeAsync();
                return (false, null, "Input and output items must be different");
            }

            // Validate SetPointId if provided
            if (pidMemory.SetPointId.HasValue && pidMemory.SetPointId.Value != Guid.Empty)
            {
                var setPointItem = await context.MonitoringItems.FindAsync(pidMemory.SetPointId.Value);
                if (setPointItem == null)
                {
                    await context.DisposeAsync();
                    return (false, null, "SetPoint item not found");
                }
                
                if (setPointItem.ItemType != ItemType.AnalogInput && setPointItem.ItemType != ItemType.AnalogOutput)
                {
                    await context.DisposeAsync();
                    return (false, null, "SetPoint item must be AnalogInput or AnalogOutput");
                }
            }

            // Validate IsAutoId if provided
            if (pidMemory.IsAutoId.HasValue && pidMemory.IsAutoId.Value != Guid.Empty)
            {
                var isAutoItem = await context.MonitoringItems.FindAsync(pidMemory.IsAutoId.Value);
                if (isAutoItem == null)
                {
                    await context.DisposeAsync();
                    return (false, null, "IsAuto item not found");
                }
                
                if (isAutoItem.ItemType != ItemType.DigitalInput && isAutoItem.ItemType != ItemType.DigitalOutput)
                {
                    await context.DisposeAsync();
                    return (false, null, "IsAuto item must be DigitalInput or DigitalOutput");
                }
            }

            // Validate ManualValueId if provided
            if (pidMemory.ManualValueId.HasValue && pidMemory.ManualValueId.Value != Guid.Empty)
            {
                var manualValueItem = await context.MonitoringItems.FindAsync(pidMemory.ManualValueId.Value);
                if (manualValueItem == null)
                {
                    await context.DisposeAsync();
                    return (false, null, "ManualValue item not found");
                }
                
                if (manualValueItem.ItemType != ItemType.AnalogInput && manualValueItem.ItemType != ItemType.AnalogOutput)
                {
                    await context.DisposeAsync();
                    return (false, null, "ManualValue item must be AnalogInput or AnalogOutput");
                }
            }

            // Validate ReverseOutputId if provided
            if (pidMemory.ReverseOutputId.HasValue && pidMemory.ReverseOutputId.Value != Guid.Empty)
            {
                var reverseOutputItem = await context.MonitoringItems.FindAsync(pidMemory.ReverseOutputId.Value);
                if (reverseOutputItem == null)
                {
                    await context.DisposeAsync();
                    return (false, null, "ReverseOutput item not found");
                }
                
                if (reverseOutputItem.ItemType != ItemType.DigitalInput && reverseOutputItem.ItemType != ItemType.DigitalOutput)
                {
                    await context.DisposeAsync();
                    return (false, null, "ReverseOutput item must be DigitalInput or DigitalOutput");
                }
            }

            context.PIDMemories.Add(pidMemory);
            await context.SaveChangesAsync();
            var id = pidMemory.Id;
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
    /// Edit an existing PID memory configuration
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> EditPIDMemory(PIDMemory pidMemory)
    {
        try
        {
            var context = new DataContext();

            // Validate PID memory exists
            var existing = await context.PIDMemories.FindAsync(pidMemory.Id);
            if (existing == null)
            {
                await context.DisposeAsync();
                return (false, "PID memory not found");
            }

            // Validate InputItem exists
            var inputItem = await context.MonitoringItems.FindAsync(pidMemory.InputItemId);
            if (inputItem == null)
            {
                await context.DisposeAsync();
                return (false, "Input item not found");
            }

            // Validate InputItem is AnalogInput
            if (inputItem.ItemType != ItemType.AnalogInput)
            {
                await context.DisposeAsync();
                return (false, "Input item must be AnalogInput");
            }

            // Validate OutputItem exists
            var outputItem = await context.MonitoringItems.FindAsync(pidMemory.OutputItemId);
            if (outputItem == null)
            {
                await context.DisposeAsync();
                return (false, "Output item not found");
            }

            // Validate OutputItem is AnalogOutput
            if (outputItem.ItemType != ItemType.AnalogOutput)
            {
                await context.DisposeAsync();
                return (false, "Output item must be AnalogOutput");
            }

            // Validate InputItemId != OutputItemId
            if (pidMemory.InputItemId == pidMemory.OutputItemId)
            {
                await context.DisposeAsync();
                return (false, "Input and output items must be different");
            }

            // Validate SetPointId if provided
            if (pidMemory.SetPointId.HasValue && pidMemory.SetPointId.Value != Guid.Empty)
            {
                var setPointItem = await context.MonitoringItems.FindAsync(pidMemory.SetPointId.Value);
                if (setPointItem == null)
                {
                    await context.DisposeAsync();
                    return (false, "SetPoint item not found");
                }
                
                if (setPointItem.ItemType != ItemType.AnalogInput && setPointItem.ItemType != ItemType.AnalogOutput)
                {
                    await context.DisposeAsync();
                    return (false, "SetPoint item must be AnalogInput or AnalogOutput");
                }
            }

            // Validate IsAutoId if provided
            if (pidMemory.IsAutoId.HasValue && pidMemory.IsAutoId.Value != Guid.Empty)
            {
                var isAutoItem = await context.MonitoringItems.FindAsync(pidMemory.IsAutoId.Value);
                if (isAutoItem == null)
                {
                    await context.DisposeAsync();
                    return (false, "IsAuto item not found");
                }
                
                if (isAutoItem.ItemType != ItemType.DigitalInput && isAutoItem.ItemType != ItemType.DigitalOutput)
                {
                    await context.DisposeAsync();
                    return (false, "IsAuto item must be DigitalInput or DigitalOutput");
                }
            }

            // Validate ManualValueId if provided
            if (pidMemory.ManualValueId.HasValue && pidMemory.ManualValueId.Value != Guid.Empty)
            {
                var manualValueItem = await context.MonitoringItems.FindAsync(pidMemory.ManualValueId.Value);
                if (manualValueItem == null)
                {
                    await context.DisposeAsync();
                    return (false, "ManualValue item not found");
                }
                
                if (manualValueItem.ItemType != ItemType.AnalogInput && manualValueItem.ItemType != ItemType.AnalogOutput)
                {
                    await context.DisposeAsync();
                    return (false, "ManualValue item must be AnalogInput or AnalogOutput");
                }
            }

            // Validate ReverseOutputId if provided
            if (pidMemory.ReverseOutputId.HasValue && pidMemory.ReverseOutputId.Value != Guid.Empty)
            {
                var reverseOutputItem = await context.MonitoringItems.FindAsync(pidMemory.ReverseOutputId.Value);
                if (reverseOutputItem == null)
                {
                    await context.DisposeAsync();
                    return (false, "ReverseOutput item not found");
                }
                
                if (reverseOutputItem.ItemType != ItemType.DigitalInput && reverseOutputItem.ItemType != ItemType.DigitalOutput)
                {
                    await context.DisposeAsync();
                    return (false, "ReverseOutput item must be DigitalInput or DigitalOutput");
                }
            }

            context.PIDMemories.Update(pidMemory);
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
    /// Delete a PID memory configuration
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> DeletePIDMemory(Guid id)
    {
        try
        {
            var context = new DataContext();
            var pidMemory = await context.PIDMemories.FindAsync(id);
            
            if (pidMemory == null)
            {
                await context.DisposeAsync();
                return (false, "PID memory not found");
            }

            context.PIDMemories.Remove(pidMemory);
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
