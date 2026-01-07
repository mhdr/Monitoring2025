using System.Linq.Expressions;
using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Helper class for RateOfChangeMemory CRUD operations
/// </summary>
public class RateOfChangeMemories
{
    /// <summary>
    /// Get all rate of change memory configurations
    /// </summary>
    public static async Task<List<RateOfChangeMemory>?> GetRateOfChangeMemories()
    {
        var context = new DataContext();
        var found = await context.RateOfChangeMemories.ToListAsync();
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Get a specific rate of change memory by predicate
    /// </summary>
    public static async Task<RateOfChangeMemory?> GetRateOfChangeMemory(Expression<Func<RateOfChangeMemory, bool>> predicate)
    {
        var context = new DataContext();
        var found = await context.RateOfChangeMemories.FirstOrDefaultAsync(predicate);
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Add a new rate of change memory configuration
    /// </summary>
    public static async Task<(bool Success, Guid? Id, string? ErrorMessage)> AddRateOfChangeMemory(RateOfChangeMemory memory)
    {
        try
        {
            var context = new DataContext();
            
            // Validate Input source
            if (memory.InputType == RateOfChangeSourceType.Point)
            {
                if (!Guid.TryParse(memory.InputReference, out var inputItemId))
                {
                    await context.DisposeAsync();
                    return (false, null, "Invalid input item ID format");
                }
                
                var inputItem = await context.MonitoringItems.FindAsync(inputItemId);
                if (inputItem == null)
                {
                    await context.DisposeAsync();
                    return (false, null, "Input item not found");
                }

                // Validate InputItem type (must be analog)
                if (inputItem.ItemType != ItemType.AnalogInput && inputItem.ItemType != ItemType.AnalogOutput)
                {
                    await context.DisposeAsync();
                    return (false, null, "Input item must be AnalogInput or AnalogOutput");
                }
                
                // Set legacy field for backward compatibility
                memory.InputItemId = inputItemId;
            }
            else if (memory.InputType == RateOfChangeSourceType.GlobalVariable)
            {
                if (string.IsNullOrWhiteSpace(memory.InputReference))
                {
                    await context.DisposeAsync();
                    return (false, null, "Input global variable name cannot be empty");
                }
                
                var globalVariable = await context.GlobalVariables.FirstOrDefaultAsync(gv => gv.Name == memory.InputReference);
                if (globalVariable == null)
                {
                    await context.DisposeAsync();
                    return (false, null, "Input global variable not found");
                }

                // Validate GlobalVariable type (must be numeric)
                if (globalVariable.VariableType != GlobalVariableType.Float)
                {
                    await context.DisposeAsync();
                    return (false, null, "Input global variable must be Float type");
                }
            }

            // Validate Output source
            if (memory.OutputType == RateOfChangeSourceType.Point)
            {
                if (!Guid.TryParse(memory.OutputReference, out var outputItemId))
                {
                    await context.DisposeAsync();
                    return (false, null, "Invalid output item ID format");
                }
                
                var outputItem = await context.MonitoringItems.FindAsync(outputItemId);
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
                
                // Set legacy field for backward compatibility
                memory.OutputItemId = outputItemId;
            }
            else if (memory.OutputType == RateOfChangeSourceType.GlobalVariable)
            {
                if (string.IsNullOrWhiteSpace(memory.OutputReference))
                {
                    await context.DisposeAsync();
                    return (false, null, "Output global variable name cannot be empty");
                }
                
                var globalVariable = await context.GlobalVariables.FirstOrDefaultAsync(gv => gv.Name == memory.OutputReference);
                if (globalVariable == null)
                {
                    await context.DisposeAsync();
                    return (false, null, "Output global variable not found");
                }

                // Validate GlobalVariable type (must be numeric)
                if (globalVariable.VariableType != GlobalVariableType.Float)
                {
                    await context.DisposeAsync();
                    return (false, null, "Output global variable must be Float type");
                }
            }

            // Validate AlarmOutput source if provided
            if (memory.AlarmOutputType.HasValue)
            {
                if (memory.AlarmOutputType.Value == RateOfChangeSourceType.Point)
                {
                    if (string.IsNullOrWhiteSpace(memory.AlarmOutputReference))
                    {
                        await context.DisposeAsync();
                        return (false, null, "Alarm output reference cannot be empty when alarm output type is set");
                    }
                    
                    if (!Guid.TryParse(memory.AlarmOutputReference, out var alarmOutputItemId))
                    {
                        await context.DisposeAsync();
                        return (false, null, "Invalid alarm output item ID format");
                    }
                    
                    var alarmOutputItem = await context.MonitoringItems.FindAsync(alarmOutputItemId);
                    if (alarmOutputItem == null)
                    {
                        await context.DisposeAsync();
                        return (false, null, "Alarm output item not found");
                    }

                    if (alarmOutputItem.ItemType != ItemType.DigitalOutput)
                    {
                        await context.DisposeAsync();
                        return (false, null, "Alarm output item must be DigitalOutput");
                    }
                    
                    // Set legacy field for backward compatibility
                    memory.AlarmOutputItemId = alarmOutputItemId;
                }
                else if (memory.AlarmOutputType.Value == RateOfChangeSourceType.GlobalVariable)
                {
                    if (string.IsNullOrWhiteSpace(memory.AlarmOutputReference))
                    {
                        await context.DisposeAsync();
                        return (false, null, "Alarm output global variable name cannot be empty");
                    }
                    
                    var globalVariable = await context.GlobalVariables.FirstOrDefaultAsync(gv => gv.Name == memory.AlarmOutputReference);
                    if (globalVariable == null)
                    {
                    await context.DisposeAsync();
                        return (false, null, "Alarm output global variable not found");
                    }

                    // Validate GlobalVariable type (must be boolean or numeric)
                    if (globalVariable.VariableType != GlobalVariableType.Boolean && 
                        globalVariable.VariableType != GlobalVariableType.Float)
                    {
                        await context.DisposeAsync();
                        return (false, null, "Alarm output global variable must be Boolean or Float type");
                    }
                }
            }

            // Validate Input != Output
            if (memory.InputType == memory.OutputType && memory.InputReference == memory.OutputReference)
            {
                await context.DisposeAsync();
                return (false, null, "Input and output sources must be different");
            }

            // Validate Interval > 0
            if (memory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, null, "Interval must be greater than 0");
            }

            // Validate TimeWindowSeconds > 0
            if (memory.TimeWindowSeconds <= 0)
            {
                await context.DisposeAsync();
                return (false, null, "Time window must be greater than 0");
            }

            // Validate SmoothingFilterAlpha is in range [0, 1]
            if (memory.SmoothingFilterAlpha < 0 || memory.SmoothingFilterAlpha > 1)
            {
                await context.DisposeAsync();
                return (false, null, "Smoothing filter alpha must be between 0 and 1");
            }

            // Validate hysteresis values are in range (0, 1]
            if (memory.HighRateHysteresis <= 0 || memory.HighRateHysteresis > 1)
            {
                await context.DisposeAsync();
                return (false, null, "High rate hysteresis must be between 0 (exclusive) and 1 (inclusive)");
            }

            if (memory.LowRateHysteresis <= 0 || memory.LowRateHysteresis > 1)
            {
                await context.DisposeAsync();
                return (false, null, "Low rate hysteresis must be between 0 (exclusive) and 1 (inclusive)");
            }

            // Validate BaselineSampleCount >= 0
            if (memory.BaselineSampleCount < 0)
            {
                await context.DisposeAsync();
                return (false, null, "Baseline sample count must be 0 or greater");
            }

            // Validate DecimalPlaces
            if (memory.DecimalPlaces < 0 || memory.DecimalPlaces > 10)
            {
                await context.DisposeAsync();
                return (false, null, "Decimal places must be between 0 and 10");
            }

            // Validate LinearRegression requires minimum samples
            if (memory.CalculationMethod == RateCalculationMethod.LinearRegression)
            {
                // Calculate expected samples in window: TimeWindowSeconds / Interval
                int expectedSamples = memory.TimeWindowSeconds / memory.Interval;
                if (expectedSamples < 5)
                {
                    await context.DisposeAsync();
                    return (false, null, "Linear regression requires at least 5 samples in the time window. Increase time window or decrease interval.");
                }
            }

            // Validate thresholds - if alarm output is set, at least one threshold must be set
            if (memory.AlarmOutputType.HasValue)
            {
                if (!memory.HighRateThreshold.HasValue && !memory.LowRateThreshold.HasValue)
                {
                    await context.DisposeAsync();
                    return (false, null, "At least one threshold must be set when alarm output is configured");
                }
            }

            context.RateOfChangeMemories.Add(memory);
            await context.SaveChangesAsync();
            
            await context.DisposeAsync();
            return (true, memory.Id, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to add rate of change memory", ex, new Dictionary<string, object?>
            {
                ["RateOfChangeMemory"] = memory
            });
            return (false, null, $"Exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Edit an existing rate of change memory configuration
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> EditRateOfChangeMemory(RateOfChangeMemory memory)
    {
        try
        {
            var context = new DataContext();

            // Check if memory exists
            var existingMemory = await context.RateOfChangeMemories.FindAsync(memory.Id);
            if (existingMemory == null)
            {
                await context.DisposeAsync();
                return (false, "Rate of change memory not found");
            }

            // Validate Input source
            if (memory.InputType == RateOfChangeSourceType.Point)
            {
                if (!Guid.TryParse(memory.InputReference, out var inputItemId))
                {
                    await context.DisposeAsync();
                    return (false, "Invalid input item ID format");
                }
                
                var inputItem = await context.MonitoringItems.FindAsync(inputItemId);
                if (inputItem == null)
                {
                    await context.DisposeAsync();
                    return (false, "Input item not found");
                }

                // Validate InputItem type (must be analog)
                if (inputItem.ItemType != ItemType.AnalogInput && inputItem.ItemType != ItemType.AnalogOutput)
                {
                    await context.DisposeAsync();
                    return (false, "Input item must be AnalogInput or AnalogOutput");
                }
                
                // Set legacy field for backward compatibility
                memory.InputItemId = inputItemId;
            }
            else if (memory.InputType == RateOfChangeSourceType.GlobalVariable)
            {
                if (string.IsNullOrWhiteSpace(memory.InputReference))
                {
                    await context.DisposeAsync();
                    return (false, "Input global variable name cannot be empty");
                }
                
                var globalVariable = await context.GlobalVariables.FirstOrDefaultAsync(gv => gv.Name == memory.InputReference);
                if (globalVariable == null)
                {
                    await context.DisposeAsync();
                    return (false, "Input global variable not found");
                }

                // Validate GlobalVariable type (must be numeric)
                if (globalVariable.VariableType != GlobalVariableType.Float)
                {
                    await context.DisposeAsync();
                    return (false, "Input global variable must be Float type");
                }
            }

            // Validate Output source
            if (memory.OutputType == RateOfChangeSourceType.Point)
            {
                if (!Guid.TryParse(memory.OutputReference, out var outputItemId))
                {
                    await context.DisposeAsync();
                    return (false, "Invalid output item ID format");
                }
                
                var outputItem = await context.MonitoringItems.FindAsync(outputItemId);
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
                
                // Set legacy field for backward compatibility
                memory.OutputItemId = outputItemId;
            }
            else if (memory.OutputType == RateOfChangeSourceType.GlobalVariable)
            {
                if (string.IsNullOrWhiteSpace(memory.OutputReference))
                {
                    await context.DisposeAsync();
                    return (false, "Output global variable name cannot be empty");
                }
                
                var globalVariable = await context.GlobalVariables.FirstOrDefaultAsync(gv => gv.Name == memory.OutputReference);
                if (globalVariable == null)
                {
                    await context.DisposeAsync();
                    return (false, "Output global variable not found");
                }

                // Validate GlobalVariable type (must be numeric)
                if (globalVariable.VariableType != GlobalVariableType.Float)
                {
                    await context.DisposeAsync();
                    return (false, "Output global variable must be Float type");
                }
            }

            // Validate AlarmOutput source if provided
            if (memory.AlarmOutputType.HasValue)
            {
                if (memory.AlarmOutputType.Value == RateOfChangeSourceType.Point)
                {
                    if (string.IsNullOrWhiteSpace(memory.AlarmOutputReference))
                    {
                        await context.DisposeAsync();
                        return (false, "Alarm output reference cannot be empty when alarm output type is set");
                    }
                    
                    if (!Guid.TryParse(memory.AlarmOutputReference, out var alarmOutputItemId))
                    {
                        await context.DisposeAsync();
                        return (false, "Invalid alarm output item ID format");
                    }
                    
                    var alarmOutputItem = await context.MonitoringItems.FindAsync(alarmOutputItemId);
                    if (alarmOutputItem == null)
                    {
                        await context.DisposeAsync();
                        return (false, "Alarm output item not found");
                    }

                    if (alarmOutputItem.ItemType != ItemType.DigitalOutput)
                    {
                        await context.DisposeAsync();
                        return (false, "Alarm output item must be DigitalOutput");
                    }
                    
                    // Set legacy field for backward compatibility
                    memory.AlarmOutputItemId = alarmOutputItemId;
                }
                else if (memory.AlarmOutputType.Value == RateOfChangeSourceType.GlobalVariable)
                {
                    if (string.IsNullOrWhiteSpace(memory.AlarmOutputReference))
                    {
                        await context.DisposeAsync();
                        return (false, "Alarm output global variable name cannot be empty");
                    }
                    
                    var globalVariable = await context.GlobalVariables.FirstOrDefaultAsync(gv => gv.Name == memory.AlarmOutputReference);
                    if (globalVariable == null)
                    {
                        await context.DisposeAsync();
                        return (false, "Alarm output global variable not found");
                    }

                    // Validate GlobalVariable type (must be boolean or numeric)
                    if (globalVariable.VariableType != GlobalVariableType.Boolean && 
                        globalVariable.VariableType != GlobalVariableType.Float)
                    {
                        await context.DisposeAsync();
                        return (false, "Alarm output global variable must be Boolean or Float type");
                    }
                    
                    // Clear legacy field
                    memory.AlarmOutputItemId = null;
                }
            }
            else
            {
                // Clear both if alarm output is not set
                memory.AlarmOutputReference = null;
                memory.AlarmOutputItemId = null;
            }

            // Validate Input != Output
            if (memory.InputType == memory.OutputType && memory.InputReference == memory.OutputReference)
            {
                await context.DisposeAsync();
                return (false, "Input and output sources must be different");
            }

            // Validate Interval > 0
            if (memory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, "Interval must be greater than 0");
            }

            // Validate TimeWindowSeconds > 0
            if (memory.TimeWindowSeconds <= 0)
            {
                await context.DisposeAsync();
                return (false, "Time window must be greater than 0");
            }

            // Validate SmoothingFilterAlpha is in range [0, 1]
            if (memory.SmoothingFilterAlpha < 0 || memory.SmoothingFilterAlpha > 1)
            {
                await context.DisposeAsync();
                return (false, "Smoothing filter alpha must be between 0 and 1");
            }

            // Validate hysteresis values are in range (0, 1]
            if (memory.HighRateHysteresis <= 0 || memory.HighRateHysteresis > 1)
            {
                await context.DisposeAsync();
                return (false, "High rate hysteresis must be between 0 (exclusive) and 1 (inclusive)");
            }

            if (memory.LowRateHysteresis <= 0 || memory.LowRateHysteresis > 1)
            {
                await context.DisposeAsync();
                return (false, "Low rate hysteresis must be between 0 (exclusive) and 1 (inclusive)");
            }

            // Validate BaselineSampleCount >= 0
            if (memory.BaselineSampleCount < 0)
            {
                await context.DisposeAsync();
                return (false, "Baseline sample count must be 0 or greater");
            }

            // Validate DecimalPlaces
            if (memory.DecimalPlaces < 0 || memory.DecimalPlaces > 10)
            {
                await context.DisposeAsync();
                return (false, "Decimal places must be between 0 and 10");
            }

            // Validate LinearRegression requires minimum samples
            if (memory.CalculationMethod == RateCalculationMethod.LinearRegression)
            {
                int expectedSamples = memory.TimeWindowSeconds / memory.Interval;
                if (expectedSamples < 5)
                {
                    await context.DisposeAsync();
                    return (false, "Linear regression requires at least 5 samples in the time window. Increase time window or decrease interval.");
                }
            }

            // Validate thresholds - if alarm output is set, at least one threshold must be set
            if (memory.AlarmOutputType.HasValue)
            {
                if (!memory.HighRateThreshold.HasValue && !memory.LowRateThreshold.HasValue)
                {
                    await context.DisposeAsync();
                    return (false, "At least one threshold must be set when alarm output is configured");
                }
            }

            // Check if configuration changed significantly - if so, reset samples and baseline
            bool configChanged = existingMemory.InputType != memory.InputType ||
                                 existingMemory.InputReference != memory.InputReference ||
                                 existingMemory.TimeWindowSeconds != memory.TimeWindowSeconds ||
                                 existingMemory.CalculationMethod != memory.CalculationMethod ||
                                 existingMemory.Interval != memory.Interval;

            if (configChanged)
            {
                // Delete all existing samples for this memory
                var samplesToDelete = await context.RateOfChangeSamples
                    .Where(s => s.RateOfChangeMemoryId == memory.Id)
                    .ToListAsync();
                context.RateOfChangeSamples.RemoveRange(samplesToDelete);

                // Reset baseline and state
                memory.AccumulatedSamples = 0;
                memory.LastInputValue = null;
                memory.LastTimestamp = null;
                memory.LastSmoothedRate = null;
                memory.AlarmState = null;

                MyLog.Info("Rate of change memory configuration changed, resetting samples and baseline", new Dictionary<string, object?>
                {
                    ["MemoryId"] = memory.Id,
                    ["MemoryName"] = memory.Name
                });
            }

            // Detach the tracked entity and update with new values
            context.Entry(existingMemory).State = EntityState.Detached;
            context.RateOfChangeMemories.Update(memory);
            await context.SaveChangesAsync();
            
            await context.DisposeAsync();
            return (true, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to edit rate of change memory", ex, new Dictionary<string, object?>
            {
                ["RateOfChangeMemory"] = memory
            });
            return (false, $"Exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Delete a rate of change memory configuration (cascade deletes samples)
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> DeleteRateOfChangeMemory(Guid id)
    {
        try
        {
            var context = new DataContext();
            var memory = await context.RateOfChangeMemories.FindAsync(id);
            
            if (memory == null)
            {
                await context.DisposeAsync();
                return (false, "Rate of change memory not found");
            }

            // Samples are cascade deleted by foreign key relationship
            context.RateOfChangeMemories.Remove(memory);
            await context.SaveChangesAsync();
            
            await context.DisposeAsync();
            return (true, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to delete rate of change memory", ex, new Dictionary<string, object?>
            {
                ["Id"] = id
            });
            return (false, $"Exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Reset a rate of change memory's state (clears baseline, samples, and alarm state)
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> ResetRateOfChangeMemory(Guid id)
    {
        try
        {
            var context = new DataContext();
            var memory = await context.RateOfChangeMemories.FindAsync(id);
            
            if (memory == null)
            {
                await context.DisposeAsync();
                return (false, "Rate of change memory not found");
            }

            // Delete all samples
            var samplesToDelete = await context.RateOfChangeSamples
                .Where(s => s.RateOfChangeMemoryId == id)
                .ToListAsync();
            context.RateOfChangeSamples.RemoveRange(samplesToDelete);

            // Reset state
            memory.AccumulatedSamples = 0;
            memory.LastInputValue = null;
            memory.LastTimestamp = null;
            memory.LastSmoothedRate = null;
            memory.AlarmState = null;

            context.RateOfChangeMemories.Update(memory);
            await context.SaveChangesAsync();
            
            // Write zero to output items
            await Points.WriteOrAddValue(memory.OutputItemId, "0");
            if (memory.AlarmOutputItemId.HasValue)
            {
                await Points.WriteOrAddValue(memory.AlarmOutputItemId.Value, "0");
            }
            
            await context.DisposeAsync();
            
            MyLog.Info("Rate of change memory reset", new Dictionary<string, object?>
            {
                ["Id"] = id,
                ["Name"] = memory.Name
            });
            
            return (true, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to reset rate of change memory", ex, new Dictionary<string, object?>
            {
                ["Id"] = id
            });
            return (false, $"Exception: {ex.Message}");
        }
    }
}
