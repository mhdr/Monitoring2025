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
    /// Validates a PID source reference (Point or GlobalVariable)
    /// </summary>
    private static async Task<(bool IsValid, Guid? ItemId, string? ErrorMessage)> ValidatePIDSource(
        DataContext context,
        PIDSourceType sourceType,
        string sourceReference,
        string fieldName,
        ItemType? requiredItemType = null)
    {
        if (sourceType == PIDSourceType.Point)
        {
            if (!Guid.TryParse(sourceReference, out var itemId))
            {
                return (false, null, $"Invalid {fieldName} item GUID");
            }
            
            var item = await context.MonitoringItems.FindAsync(itemId);
            if (item == null)
            {
                return (false, null, $"{fieldName} item not found");
            }
            
            // Validate item type if specified
            if (requiredItemType.HasValue && item.ItemType != requiredItemType.Value)
            {
                return (false, null, $"{fieldName} item must be {requiredItemType.Value}");
            }
            
            return (true, itemId, null);
        }
        else if (sourceType == PIDSourceType.GlobalVariable)
        {
            var variable = await GlobalVariables.GetGlobalVariableByName(sourceReference);
            if (variable == null)
            {
                return (false, null, $"{fieldName} global variable not found");
            }
            
            if (variable.IsDisabled)
            {
                return (false, null, $"{fieldName} global variable is disabled");
            }
            
            return (true, null, null);
        }
        
        return (false, null, $"Invalid {fieldName} source type");
    }
    
    /// <summary>
    /// Validates that two PID sources are different
    /// </summary>
    private static bool AreSameSource(
        PIDSourceType type1, string reference1,
        PIDSourceType type2, string reference2)
    {
        return type1 == type2 && reference1.Equals(reference2, StringComparison.OrdinalIgnoreCase);
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
            
            // Validate Input source
            var inputValidation = await ValidatePIDSource(context, pidMemory.InputType, pidMemory.InputReference, "Input", ItemType.AnalogInput);
            if (!inputValidation.IsValid)
            {
                await context.DisposeAsync();
                return (false, null, inputValidation.ErrorMessage);
            }

            // Validate Output source
            var outputValidation = await ValidatePIDSource(context, pidMemory.OutputType, pidMemory.OutputReference, "Output", ItemType.AnalogOutput);
            if (!outputValidation.IsValid)
            {
                await context.DisposeAsync();
                return (false, null, outputValidation.ErrorMessage);
            }

            // Validate Input != Output
            if (AreSameSource(pidMemory.InputType, pidMemory.InputReference, pidMemory.OutputType, pidMemory.OutputReference))
            {
                await context.DisposeAsync();
                return (false, null, "Input and output sources must be different");
            }

            // Validate SetPoint source (required, AnalogInput or AnalogOutput for Points)
            var setPointValidation = await ValidatePIDSource(context, pidMemory.SetPointType, pidMemory.SetPointReference, "SetPoint");
            if (!setPointValidation.IsValid)
            {
                await context.DisposeAsync();
                return (false, null, setPointValidation.ErrorMessage);
            }
            
            // If SetPoint is a Point, validate it's Analog type
            if (pidMemory.SetPointType == PIDSourceType.Point && setPointValidation.ItemId.HasValue)
            {
                var setPointItem = await context.MonitoringItems.FindAsync(setPointValidation.ItemId.Value);
                if (setPointItem != null && setPointItem.ItemType != ItemType.AnalogInput && setPointItem.ItemType != ItemType.AnalogOutput)
                {
                    await context.DisposeAsync();
                    return (false, null, "SetPoint item must be AnalogInput or AnalogOutput");
                }
            }

            // Validate IsAuto source (required, DigitalInput or DigitalOutput for Points)
            var isAutoValidation = await ValidatePIDSource(context, pidMemory.IsAutoType, pidMemory.IsAutoReference, "IsAuto");
            if (!isAutoValidation.IsValid)
            {
                await context.DisposeAsync();
                return (false, null, isAutoValidation.ErrorMessage);
            }
            
            // If IsAuto is a Point, validate it's Digital type
            if (pidMemory.IsAutoType == PIDSourceType.Point && isAutoValidation.ItemId.HasValue)
            {
                var isAutoItem = await context.MonitoringItems.FindAsync(isAutoValidation.ItemId.Value);
                if (isAutoItem != null && isAutoItem.ItemType != ItemType.DigitalInput && isAutoItem.ItemType != ItemType.DigitalOutput)
                {
                    await context.DisposeAsync();
                    return (false, null, "IsAuto item must be DigitalInput or DigitalOutput");
                }
            }

            // Validate ManualValue source (required, AnalogInput or AnalogOutput for Points)
            var manualValueValidation = await ValidatePIDSource(context, pidMemory.ManualValueType, pidMemory.ManualValueReference, "ManualValue");
            if (!manualValueValidation.IsValid)
            {
                await context.DisposeAsync();
                return (false, null, manualValueValidation.ErrorMessage);
            }
            
            // If ManualValue is a Point, validate it's Analog type
            if (pidMemory.ManualValueType == PIDSourceType.Point && manualValueValidation.ItemId.HasValue)
            {
                var manualValueItem = await context.MonitoringItems.FindAsync(manualValueValidation.ItemId.Value);
                if (manualValueItem != null && manualValueItem.ItemType != ItemType.AnalogInput && manualValueItem.ItemType != ItemType.AnalogOutput)
                {
                    await context.DisposeAsync();
                    return (false, null, "ManualValue item must be AnalogInput or AnalogOutput");
                }
            }

            // Validate ReverseOutput source (required, DigitalInput or DigitalOutput for Points)
            var reverseOutputValidation = await ValidatePIDSource(context, pidMemory.ReverseOutputType, pidMemory.ReverseOutputReference, "ReverseOutput");
            if (!reverseOutputValidation.IsValid)
            {
                await context.DisposeAsync();
                return (false, null, reverseOutputValidation.ErrorMessage);
            }
            
            // If ReverseOutput is a Point, validate it's Digital type
            if (pidMemory.ReverseOutputType == PIDSourceType.Point && reverseOutputValidation.ItemId.HasValue)
            {
                var reverseOutputItem = await context.MonitoringItems.FindAsync(reverseOutputValidation.ItemId.Value);
                if (reverseOutputItem != null && reverseOutputItem.ItemType != ItemType.DigitalInput && reverseOutputItem.ItemType != ItemType.DigitalOutput)
                {
                    await context.DisposeAsync();
                    return (false, null, "ReverseOutput item must be DigitalInput or DigitalOutput");
                }
            }

            // Validate DigitalOutput source if provided
            if (pidMemory.DigitalOutputType.HasValue && !string.IsNullOrEmpty(pidMemory.DigitalOutputReference))
            {
                var digitalOutputValidation = await ValidatePIDSource(context, pidMemory.DigitalOutputType.Value, pidMemory.DigitalOutputReference, "DigitalOutput", ItemType.DigitalOutput);
                if (!digitalOutputValidation.IsValid)
                {
                    await context.DisposeAsync();
                    return (false, null, digitalOutputValidation.ErrorMessage);
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

            // Note: Cascade validation is temporarily disabled as it needs to be updated for the new model
            // TODO: Update cascade validation to work with PIDSourceType references
            
            context.PIDMemories.Add(pidMemory);
            await context.SaveChangesAsync();
            var id = pidMemory.Id;
            await context.DisposeAsync();
            
            // Invalidate usage cache for referenced global variables
            await GlobalVariableUsageCache.OnMemoryChanged(id, "PIDMemory");
            
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
            var existing = await context.PIDMemories.AsNoTracking().FirstOrDefaultAsync(p => p.Id == pidMemory.Id);
            if (existing == null)
            {
                await context.DisposeAsync();
                return (false, "PID memory not found");
            }

            // Validate Input source
            var inputValidation = await ValidatePIDSource(context, pidMemory.InputType, pidMemory.InputReference, "Input", ItemType.AnalogInput);
            if (!inputValidation.IsValid)
            {
                await context.DisposeAsync();
                return (false, inputValidation.ErrorMessage);
            }

            // Validate Output source
            var outputValidation = await ValidatePIDSource(context, pidMemory.OutputType, pidMemory.OutputReference, "Output", ItemType.AnalogOutput);
            if (!outputValidation.IsValid)
            {
                await context.DisposeAsync();
                return (false, outputValidation.ErrorMessage);
            }

            // Validate Input != Output
            if (AreSameSource(pidMemory.InputType, pidMemory.InputReference, pidMemory.OutputType, pidMemory.OutputReference))
            {
                await context.DisposeAsync();
                return (false, "Input and output sources must be different");
            }

            // Validate SetPoint source (required, AnalogInput or AnalogOutput for Points)
            var setPointValidation = await ValidatePIDSource(context, pidMemory.SetPointType, pidMemory.SetPointReference, "SetPoint");
            if (!setPointValidation.IsValid)
            {
                await context.DisposeAsync();
                return (false, setPointValidation.ErrorMessage);
            }
            
            // If SetPoint is a Point, validate it's Analog type
            if (pidMemory.SetPointType == PIDSourceType.Point && setPointValidation.ItemId.HasValue)
            {
                var setPointItem = await context.MonitoringItems.FindAsync(setPointValidation.ItemId.Value);
                if (setPointItem != null && setPointItem.ItemType != ItemType.AnalogInput && setPointItem.ItemType != ItemType.AnalogOutput)
                {
                    await context.DisposeAsync();
                    return (false, "SetPoint item must be AnalogInput or AnalogOutput");
                }
            }

            // Validate IsAuto source (required, DigitalInput or DigitalOutput for Points)
            var isAutoValidation = await ValidatePIDSource(context, pidMemory.IsAutoType, pidMemory.IsAutoReference, "IsAuto");
            if (!isAutoValidation.IsValid)
            {
                await context.DisposeAsync();
                return (false, isAutoValidation.ErrorMessage);
            }
            
            // If IsAuto is a Point, validate it's Digital type
            if (pidMemory.IsAutoType == PIDSourceType.Point && isAutoValidation.ItemId.HasValue)
            {
                var isAutoItem = await context.MonitoringItems.FindAsync(isAutoValidation.ItemId.Value);
                if (isAutoItem != null && isAutoItem.ItemType != ItemType.DigitalInput && isAutoItem.ItemType != ItemType.DigitalOutput)
                {
                    await context.DisposeAsync();
                    return (false, "IsAuto item must be DigitalInput or DigitalOutput");
                }
            }

            // Validate ManualValue source (required, AnalogInput or AnalogOutput for Points)
            var manualValueValidation = await ValidatePIDSource(context, pidMemory.ManualValueType, pidMemory.ManualValueReference, "ManualValue");
            if (!manualValueValidation.IsValid)
            {
                await context.DisposeAsync();
                return (false, manualValueValidation.ErrorMessage);
            }
            
            // If ManualValue is a Point, validate it's Analog type
            if (pidMemory.ManualValueType == PIDSourceType.Point && manualValueValidation.ItemId.HasValue)
            {
                var manualValueItem = await context.MonitoringItems.FindAsync(manualValueValidation.ItemId.Value);
                if (manualValueItem != null && manualValueItem.ItemType != ItemType.AnalogInput && manualValueItem.ItemType != ItemType.AnalogOutput)
                {
                    await context.DisposeAsync();
                    return (false, "ManualValue item must be AnalogInput or AnalogOutput");
                }
            }

            // Validate ReverseOutput source (required, DigitalInput or DigitalOutput for Points)
            var reverseOutputValidation = await ValidatePIDSource(context, pidMemory.ReverseOutputType, pidMemory.ReverseOutputReference, "ReverseOutput");
            if (!reverseOutputValidation.IsValid)
            {
                await context.DisposeAsync();
                return (false, reverseOutputValidation.ErrorMessage);
            }
            
            // If ReverseOutput is a Point, validate it's Digital type
            if (pidMemory.ReverseOutputType == PIDSourceType.Point && reverseOutputValidation.ItemId.HasValue)
            {
                var reverseOutputItem = await context.MonitoringItems.FindAsync(reverseOutputValidation.ItemId.Value);
                if (reverseOutputItem != null && reverseOutputItem.ItemType != ItemType.DigitalInput && reverseOutputItem.ItemType != ItemType.DigitalOutput)
                {
                    await context.DisposeAsync();
                    return (false, "ReverseOutput item must be DigitalInput or DigitalOutput");
                }
            }

            // Validate DigitalOutput source if provided
            if (pidMemory.DigitalOutputType.HasValue && !string.IsNullOrEmpty(pidMemory.DigitalOutputReference))
            {
                var digitalOutputValidation = await ValidatePIDSource(context, pidMemory.DigitalOutputType.Value, pidMemory.DigitalOutputReference, "DigitalOutput", ItemType.DigitalOutput);
                if (!digitalOutputValidation.IsValid)
                {
                    await context.DisposeAsync();
                    return (false, digitalOutputValidation.ErrorMessage);
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

            // Note: Cascade validation is temporarily disabled as it needs to be updated for the new model
            // TODO: Update cascade validation to work with PIDSourceType references

            context.PIDMemories.Update(pidMemory);
            await context.SaveChangesAsync();
            await context.DisposeAsync();
            
            // Invalidate usage cache for referenced global variables
            await GlobalVariableUsageCache.OnMemoryChanged(pidMemory.Id, "PIDMemory");
            
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

    #region PID Auto-Tuning Methods

    /// <summary>
    /// Starts a new auto-tuning session for the specified PID controller.
    /// </summary>
    public static async Task<(bool Success, Guid? SessionId, string? ErrorMessage)> StartPIDTuning(
        Guid pidMemoryId,
        double relayAmplitude = 20.0,
        double relayHysteresis = 0.5,
        int minCycles = 3,
        int maxCycles = 10,
        double maxAmplitude = 10.0,
        int timeout = 600)
    {
        try
        {
            var context = new DataContext();
            
            // Validate PID exists
            var pidMemory = await context.PIDMemories.FindAsync(pidMemoryId);
            if (pidMemory == null)
            {
                await context.DisposeAsync();
                return (false, null, "PID memory not found");
            }

            // Check if already tuning
            var existingSession = await context.PIDTuningSessions
                .Where(s => s.PIDMemoryId == pidMemoryId && 
                           (s.Status == TuningStatus.Initializing || 
                            s.Status == TuningStatus.RelayTest || 
                            s.Status == TuningStatus.AnalyzingData))
                .FirstOrDefaultAsync();

            if (existingSession != null)
            {
                await context.DisposeAsync();
                return (false, null, "PID is already undergoing auto-tuning");
            }

            // Validate parameters
            if (relayAmplitude < 5.0 || relayAmplitude > 50.0)
            {
                await context.DisposeAsync();
                return (false, null, "RelayAmplitude must be between 5% and 50%");
            }

            if (minCycles < 2 || minCycles > maxCycles)
            {
                await context.DisposeAsync();
                return (false, null, "MinCycles must be between 2 and MaxCycles");
            }

            // Validate cascade constraints
            if (pidMemory.ParentPIDId.HasValue)
            {
                var parentPID = await context.PIDMemories.FindAsync(pidMemory.ParentPIDId.Value);
                if (parentPID != null && !parentPID.IsDisabled)
                {
                    await context.DisposeAsync();
                    return (false, null, "Cannot tune: Parent PID must be disabled first");
                }
            }

            // Create tuning session
            var session = new PIDTuningSession
            {
                PIDMemoryId = pidMemoryId,
                StartTime = DateTime.UtcNow,
                Status = TuningStatus.Initializing,
                RelayAmplitude = relayAmplitude,
                RelayHysteresis = relayHysteresis,
                MinCycles = minCycles,
                MaxCycles = maxCycles,
                MaxAmplitude = maxAmplitude,
                Timeout = timeout,
                OriginalKp = pidMemory.Kp,
                OriginalKi = pidMemory.Ki,
                OriginalKd = pidMemory.Kd
            };

            context.PIDTuningSessions.Add(session);
            await context.SaveChangesAsync();

            var sessionId = session.Id;
            await context.DisposeAsync();

            MyLog.Info($"Auto-tuning session started for PID {pidMemoryId}", new Dictionary<string, object?>
            {
                ["SessionId"] = sessionId,
                ["RelayAmplitude"] = relayAmplitude,
                ["Timeout"] = timeout
            });

            return (true, sessionId, null);
        }
        catch (Exception e)
        {
            MyLog.LogJson(e);
            return (false, null, e.Message);
        }
    }

    /// <summary>
    /// Gets the current or most recent tuning session for a PID controller.
    /// </summary>
    public static async Task<PIDTuningSession?> GetPIDTuningSession(Guid pidMemoryId)
    {
        try
        {
            var context = new DataContext();
            var session = await context.PIDTuningSessions
                .Where(s => s.PIDMemoryId == pidMemoryId)
                .OrderByDescending(s => s.StartTime)
                .FirstOrDefaultAsync();
            
            await context.DisposeAsync();
            return session;
        }
        catch (Exception e)
        {
            MyLog.LogJson(e);
            return null;
        }
    }

    /// <summary>
    /// Gets a tuning session by its ID.
    /// </summary>
    public static async Task<PIDTuningSession?> GetPIDTuningSessionById(Guid sessionId)
    {
        try
        {
            var context = new DataContext();
            var session = await context.PIDTuningSessions.FindAsync(sessionId);
            await context.DisposeAsync();
            return session;
        }
        catch (Exception e)
        {
            MyLog.LogJson(e);
            return null;
        }
    }

    /// <summary>
    /// Applies calculated PID gains from a completed tuning session to the PID controller.
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> ApplyTunedParameters(
        Guid sessionId,
        bool applyKp = true,
        bool applyKi = true,
        bool applyKd = true)
    {
        try
        {
            var context = new DataContext();
            
            var session = await context.PIDTuningSessions.FindAsync(sessionId);
            if (session == null)
            {
                await context.DisposeAsync();
                return (false, "Tuning session not found");
            }

            if (session.Status != TuningStatus.Completed)
            {
                await context.DisposeAsync();
                return (false, $"Cannot apply parameters: Session status is {session.Status}");
            }

            if (!session.CalculatedKp.HasValue || !session.CalculatedKi.HasValue || !session.CalculatedKd.HasValue)
            {
                await context.DisposeAsync();
                return (false, "Calculated gains are not available");
            }

            var pidMemory = await context.PIDMemories.FindAsync(session.PIDMemoryId);
            if (pidMemory == null)
            {
                await context.DisposeAsync();
                return (false, "PID memory not found");
            }

            // Apply selected gains
            if (applyKp) pidMemory.Kp = session.CalculatedKp.Value;
            if (applyKi) pidMemory.Ki = session.CalculatedKi.Value;
            if (applyKd) pidMemory.Kd = session.CalculatedKd.Value;

            context.PIDMemories.Update(pidMemory);
            await context.SaveChangesAsync();
            await context.DisposeAsync();

            // Clear PID state to force reinitialization with new gains
            await Points.DeletePIDState(session.PIDMemoryId);

            MyLog.Info($"Applied tuned parameters to PID {session.PIDMemoryId}", new Dictionary<string, object?>
            {
                ["SessionId"] = sessionId,
                ["Kp"] = applyKp ? session.CalculatedKp : pidMemory.Kp,
                ["Ki"] = applyKi ? session.CalculatedKi : pidMemory.Ki,
                ["Kd"] = applyKd ? session.CalculatedKd : pidMemory.Kd
            });

            return (true, null);
        }
        catch (Exception e)
        {
            MyLog.LogJson(e);
            return (false, e.Message);
        }
    }

    /// <summary>
    /// Aborts an active tuning session.
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> AbortPIDTuning(Guid pidMemoryId)
    {
        var success = await PIDTuningProcess.Instance.AbortTuning(pidMemoryId);
        return success 
            ? (true, null) 
            : (false, "No active tuning session found or abort failed");
    }

    #endregion
}
