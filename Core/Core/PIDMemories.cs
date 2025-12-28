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
    private const int MaxCascadeDepth = 2;
    
    /// <summary>
    /// Validates cascade configuration and detects circular references
    /// </summary>
    private static async Task<(bool IsValid, string? ErrorMessage)> ValidateCascadeConfiguration(
        DataContext context, 
        Guid currentPidId, 
        Guid? parentPidId, 
        int cascadeLevel,
        Guid outputItemId)
    {
        // If no parent specified, must be standalone (level 0)
        if (!parentPidId.HasValue || parentPidId.Value == Guid.Empty)
        {
            if (cascadeLevel != 0)
            {
                return (false, "CascadeLevel must be 0 for standalone PIDs (no parent)");
            }
            return (true, null);
        }
        
        // Validate cascade level is within allowed range
        if (cascadeLevel < 1 || cascadeLevel > MaxCascadeDepth)
        {
            return (false, $"CascadeLevel must be between 1 and {MaxCascadeDepth} when ParentPIDId is set");
        }
        
        // Validate parent PID exists
        var parentPid = await context.PIDMemories.FindAsync(parentPidId.Value);
        if (parentPid == null)
        {
            return (false, "Parent PID not found");
        }
        
        // Prevent self-reference
        if (parentPidId.Value == currentPidId)
        {
            return (false, "PID cannot be its own parent");
        }
        
        // Validate parent's cascade level is exactly one less
        if (parentPid.CascadeLevel != cascadeLevel - 1)
        {
            return (false, $"Parent PID cascade level ({parentPid.CascadeLevel}) must be exactly one less than child's level ({cascadeLevel})");
        }
        
        // Detect circular references by walking up the parent chain
        var visitedPids = new HashSet<Guid> { currentPidId };
        var currentParentId = parentPidId.Value;
        int depth = 0;
        
        while (currentParentId != Guid.Empty)
        {
            if (visitedPids.Contains(currentParentId))
            {
                return (false, "Circular reference detected in PID cascade chain");
            }
            
            visitedPids.Add(currentParentId);
            depth++;
            
            if (depth > MaxCascadeDepth + 1)
            {
                return (false, $"Cascade chain exceeds maximum depth of {MaxCascadeDepth}");
            }
            
            var parent = await context.PIDMemories.FindAsync(currentParentId);
            if (parent == null)
            {
                break;
            }
            
            currentParentId = parent.ParentPIDId ?? Guid.Empty;
        }
        
        // Validate that this PID is not already a parent of another PID
        // (A PID at level 2 cannot have children)
        if (cascadeLevel >= MaxCascadeDepth)
        {
            var hasChildren = await context.PIDMemories
                .AnyAsync(p => p.ParentPIDId == currentPidId);
            
            if (hasChildren)
            {
                return (false, $"PID at cascade level {MaxCascadeDepth} cannot be a parent (maximum cascade depth reached)");
            }
        }
        
        // Validate output compatibility is not enforced here - it's checked separately
        // because we need to verify parent's CVId matches child's SetPointId
        
        return (true, null);
    }
    
    /// <summary>
    /// Validates that parent's output matches child's setpoint in a cascade
    /// </summary>
    private static async Task<(bool IsValid, string? ErrorMessage)> ValidateCascadeSetpointMatch(
        DataContext context,
        Guid? parentPidId,
        Guid? setPointId)
    {
        // Only validate if both parent and setpoint are specified
        if (!parentPidId.HasValue || parentPidId.Value == Guid.Empty)
        {
            return (true, null);
        }
        
        if (!setPointId.HasValue || setPointId.Value == Guid.Empty)
        {
            return (false, "SetPointId must be specified when using cascaded control (parent PID specified)");
        }
        
        var parentPid = await context.PIDMemories.FindAsync(parentPidId.Value);
        if (parentPid == null)
        {
            return (false, "Parent PID not found");
        }
        
        // Verify parent's output item matches this PID's setpoint item
        if (parentPid.OutputItemId != setPointId.Value)
        {
            return (false, $"Parent PID's output item must match this PID's setpoint item for cascade control. Parent outputs to {parentPid.OutputItemId}, but this PID's setpoint is {setPointId.Value}");
        }
        
        return (true, null);
    }
    
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

            // Validate DigitalOutputItemId if provided
            if (pidMemory.DigitalOutputItemId.HasValue && pidMemory.DigitalOutputItemId.Value != Guid.Empty)
            {
                var digitalOutputItem = await context.MonitoringItems.FindAsync(pidMemory.DigitalOutputItemId.Value);
                if (digitalOutputItem == null)
                {
                    await context.DisposeAsync();
                    return (false, null, "DigitalOutput item not found");
                }
                
                if (digitalOutputItem.ItemType != ItemType.DigitalOutput)
                {
                    await context.DisposeAsync();
                    return (false, null, "DigitalOutput item must be DigitalOutput type");
                }
            }

            // Validate hysteresis thresholds
            if (pidMemory.HysteresisLowThreshold >= pidMemory.HysteresisHighThreshold)
            {
                await context.DisposeAsync();
                return (false, null, "HysteresisLowThreshold must be less than HysteresisHighThreshold");
            }

            // Validate thresholds are within output range
            if (pidMemory.HysteresisLowThreshold < pidMemory.OutputMin)
            {
                await context.DisposeAsync();
                return (false, null, $"HysteresisLowThreshold ({pidMemory.HysteresisLowThreshold}) must be >= OutputMin ({pidMemory.OutputMin})");
            }

            if (pidMemory.HysteresisHighThreshold > pidMemory.OutputMax)
            {
                await context.DisposeAsync();
                return (false, null, $"HysteresisHighThreshold ({pidMemory.HysteresisHighThreshold}) must be <= OutputMax ({pidMemory.OutputMax})");
            }

            // Validate cascade configuration
            var cascadeValidation = await ValidateCascadeConfiguration(
                context, 
                Guid.Empty, // New PID, no ID yet
                pidMemory.ParentPIDId, 
                pidMemory.CascadeLevel,
                pidMemory.OutputItemId);
            
            if (!cascadeValidation.IsValid)
            {
                await context.DisposeAsync();
                return (false, null, cascadeValidation.ErrorMessage);
            }
            
            // Validate cascade setpoint match
            var setpointValidation = await ValidateCascadeSetpointMatch(
                context,
                pidMemory.ParentPIDId,
                pidMemory.SetPointId);
            
            if (!setpointValidation.IsValid)
            {
                await context.DisposeAsync();
                return (false, null, setpointValidation.ErrorMessage);
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

            // Validate DigitalOutputItemId if provided
            if (pidMemory.DigitalOutputItemId.HasValue && pidMemory.DigitalOutputItemId.Value != Guid.Empty)
            {
                var digitalOutputItem = await context.MonitoringItems.FindAsync(pidMemory.DigitalOutputItemId.Value);
                if (digitalOutputItem == null)
                {
                    await context.DisposeAsync();
                    return (false, "DigitalOutput item not found");
                }
                
                if (digitalOutputItem.ItemType != ItemType.DigitalOutput)
                {
                    await context.DisposeAsync();
                    return (false, "DigitalOutput item must be DigitalOutput type");
                }
            }

            // Validate hysteresis thresholds
            if (pidMemory.HysteresisLowThreshold >= pidMemory.HysteresisHighThreshold)
            {
                await context.DisposeAsync();
                return (false, "HysteresisLowThreshold must be less than HysteresisHighThreshold");
            }

            // Validate thresholds are within output range
            if (pidMemory.HysteresisLowThreshold < pidMemory.OutputMin)
            {
                await context.DisposeAsync();
                return (false, $"HysteresisLowThreshold ({pidMemory.HysteresisLowThreshold}) must be >= OutputMin ({pidMemory.OutputMin})");
            }

            if (pidMemory.HysteresisHighThreshold > pidMemory.OutputMax)
            {
                await context.DisposeAsync();
                return (false, $"HysteresisHighThreshold ({pidMemory.HysteresisHighThreshold}) must be <= OutputMax ({pidMemory.OutputMax})");
            }

            // Validate cascade configuration
            var cascadeValidation = await ValidateCascadeConfiguration(
                context, 
                pidMemory.Id,
                pidMemory.ParentPIDId, 
                pidMemory.CascadeLevel,
                pidMemory.OutputItemId);
            
            if (!cascadeValidation.IsValid)
            {
                await context.DisposeAsync();
                return (false, cascadeValidation.ErrorMessage);
            }
            
            // Validate cascade setpoint match
            var setpointValidation = await ValidateCascadeSetpointMatch(
                context,
                pidMemory.ParentPIDId,
                pidMemory.SetPointId);
            
            if (!setpointValidation.IsValid)
            {
                await context.DisposeAsync();
                return (false, setpointValidation.ErrorMessage);
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
            
            // Clean up persisted state from Redis
            await Points.DeletePIDState(id);
            
            return (true, null);
        }
        catch (Exception e)
        {
            MyLog.LogJson(e);
            return (false, e.Message);
        }
    }
}
