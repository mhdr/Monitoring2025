using System.Linq.Expressions;
using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Helper class for DeadbandMemory CRUD operations
/// </summary>
public class DeadbandMemories
{
    /// <summary>
    /// Get all deadband memory configurations
    /// </summary>
    public static async Task<List<DeadbandMemory>?> GetDeadbandMemories()
    {
        var context = new DataContext();
        var found = await context.DeadbandMemories.ToListAsync();
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Get a specific deadband memory by predicate
    /// </summary>
    public static async Task<DeadbandMemory?> GetDeadbandMemory(Expression<Func<DeadbandMemory, bool>> predicate)
    {
        var context = new DataContext();
        var found = await context.DeadbandMemories.FirstOrDefaultAsync(predicate);
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Determine if an item type is analog (AnalogInput or AnalogOutput)
    /// </summary>
    private static bool IsAnalogType(ItemType itemType)
    {
        return itemType == ItemType.AnalogInput || itemType == ItemType.AnalogOutput;
    }

    /// <summary>
    /// Determine if an item type is digital (DigitalInput or DigitalOutput)
    /// </summary>
    private static bool IsDigitalType(ItemType itemType)
    {
        return itemType == ItemType.DigitalInput || itemType == ItemType.DigitalOutput;
    }

    /// <summary>
    /// Add a new deadband memory configuration
    /// </summary>
    public static async Task<(bool Success, Guid? Id, string? ErrorMessage)> AddDeadbandMemory(DeadbandMemory memory)
    {
        try
        {
            var context = new DataContext();
            
            // Validate input source
            bool inputIsAnalog = false;
            bool inputIsDigital = false;
            
            if (memory.InputType == DeadbandSourceType.Point)
            {
                // Validate InputItem exists
                if (!Guid.TryParse(memory.InputReference, out Guid inputItemGuid))
                {
                    await context.DisposeAsync();
                    return (false, null, "Input item reference is invalid");
                }

                var inputItem = await context.MonitoringItems.FindAsync(inputItemGuid);
                if (inputItem == null)
                {
                    await context.DisposeAsync();
                    return (false, null, "Input item not found");
                }

                // Validate InputItem type (must be analog or digital input/output)
                if (!IsAnalogType(inputItem.ItemType) && !IsDigitalType(inputItem.ItemType))
                {
                    await context.DisposeAsync();
                    return (false, null, "Input item must be AnalogInput, AnalogOutput, DigitalInput, or DigitalOutput");
                }
                
                inputIsAnalog = IsAnalogType(inputItem.ItemType);
                inputIsDigital = IsDigitalType(inputItem.ItemType);
            }
            else if (memory.InputType == DeadbandSourceType.GlobalVariable)
            {
                // Validate GlobalVariable exists
                var inputVariable = await context.GlobalVariables
                    .FirstOrDefaultAsync(g => g.Name == memory.InputReference);
                    
                if (inputVariable == null)
                {
                    await context.DisposeAsync();
                    return (false, null, "Input global variable not found");
                }
                
                // Variable type: Boolean=Digital, Float=Analog
                inputIsAnalog = inputVariable.VariableType == GlobalVariableType.Float;
                inputIsDigital = inputVariable.VariableType == GlobalVariableType.Boolean;
            }

            // Validate output source
            if (memory.OutputType == DeadbandSourceType.Point)
            {
                // Validate OutputItem exists
                if (!Guid.TryParse(memory.OutputReference, out Guid outputItemGuid))
                {
                    await context.DisposeAsync();
                    return (false, null, "Output item reference is invalid");
                }

                var outputItem = await context.MonitoringItems.FindAsync(outputItemGuid);
                if (outputItem == null)
                {
                    await context.DisposeAsync();
                    return (false, null, "Output item not found");
                }

                // Validate OutputItem type matches InputItem category
                bool outputIsAnalog = IsAnalogType(outputItem.ItemType);
                bool outputIsOutput = outputItem.ItemType == ItemType.AnalogOutput || outputItem.ItemType == ItemType.DigitalOutput;

                if (!outputIsOutput)
                {
                    await context.DisposeAsync();
                    return (false, null, "Output item must be AnalogOutput or DigitalOutput");
                }

                if (inputIsAnalog && outputItem.ItemType != ItemType.AnalogOutput)
                {
                    await context.DisposeAsync();
                    return (false, null, "Analog input requires AnalogOutput as output item");
                }

                if (inputIsDigital && outputItem.ItemType != ItemType.DigitalOutput)
                {
                    await context.DisposeAsync();
                    return (false, null, "Digital input requires DigitalOutput as output item");
                }
            }
            else if (memory.OutputType == DeadbandSourceType.GlobalVariable)
            {
                // Validate GlobalVariable exists
                var outputVariable = await context.GlobalVariables
                    .FirstOrDefaultAsync(g => g.Name == memory.OutputReference);
                    
                if (outputVariable == null)
                {
                    await context.DisposeAsync();
                    return (false, null, "Output global variable not found");
                }
                
                // Validate type match
                bool outputIsAnalog = outputVariable.VariableType == GlobalVariableType.Float;
                bool outputIsDigital = outputVariable.VariableType == GlobalVariableType.Boolean;
                
                if (inputIsAnalog && !outputIsAnalog)
                {
                    await context.DisposeAsync();
                    return (false, null, "Analog input requires analog output global variable");
                }

                if (inputIsDigital && !outputIsDigital)
                {
                    await context.DisposeAsync();
                    return (false, null, "Digital input requires digital output global variable");
                }
            }

            // Validate input != output (if both are same type and reference)
            if (memory.InputType == memory.OutputType && 
                memory.InputReference == memory.OutputReference)
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

            // Validate analog-specific parameters
            if (inputIsAnalog)
            {
                if (memory.Deadband < 0)
                {
                    await context.DisposeAsync();
                    return (false, null, "Deadband must be 0 or greater");
                }

                if (memory.DeadbandType == DeadbandType.Percentage)
                {
                    if (memory.Deadband > 100)
                    {
                        await context.DisposeAsync();
                        return (false, null, "Percentage deadband must be between 0 and 100");
                    }

                    if (memory.InputMax <= memory.InputMin)
                    {
                        await context.DisposeAsync();
                        return (false, null, "Input max must be greater than input min for percentage deadband");
                    }
                }
            }

            // Validate digital-specific parameters
            if (!inputIsAnalog)
            {
                if (memory.StabilityTime < 0)
                {
                    await context.DisposeAsync();
                    return (false, null, "Stability time must be 0 or greater");
                }
            }

            context.DeadbandMemories.Add(memory);
            await context.SaveChangesAsync();
            
            await context.DisposeAsync();
            return (true, memory.Id, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to add deadband memory", ex, new Dictionary<string, object?>
            {
                ["DeadbandMemory"] = memory
            });
            return (false, null, $"Exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Edit an existing deadband memory configuration
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> EditDeadbandMemory(DeadbandMemory memory)
    {
        try
        {
            var context = new DataContext();

            // Check if memory exists
            var existingMemory = await context.DeadbandMemories.FindAsync(memory.Id);
            if (existingMemory == null)
            {
                await context.DisposeAsync();
                return (false, "Deadband memory not found");
            }

            // Validate InputItem exists
            var inputItem = await context.MonitoringItems.FindAsync(memory.InputItemId);
            if (inputItem == null)
            {
                await context.DisposeAsync();
                return (false, "Input item not found");
            }

            // Validate InputItem type
            if (!IsAnalogType(inputItem.ItemType) && !IsDigitalType(inputItem.ItemType))
            {
                await context.DisposeAsync();
                return (false, "Input item must be AnalogInput, AnalogOutput, DigitalInput, or DigitalOutput");
            }

            // Validate OutputItem exists
            var outputItem = await context.MonitoringItems.FindAsync(memory.OutputItemId);
            if (outputItem == null)
            {
                await context.DisposeAsync();
                return (false, "Output item not found");
            }

            // Validate OutputItem type matches InputItem category
            bool inputIsAnalog = IsAnalogType(inputItem.ItemType);
            bool outputIsOutput = outputItem.ItemType == ItemType.AnalogOutput || outputItem.ItemType == ItemType.DigitalOutput;

            if (!outputIsOutput)
            {
                await context.DisposeAsync();
                return (false, "Output item must be AnalogOutput or DigitalOutput");
            }

            if (inputIsAnalog && outputItem.ItemType != ItemType.AnalogOutput)
            {
                await context.DisposeAsync();
                return (false, "Analog input requires AnalogOutput as output item");
            }

            if (!inputIsAnalog && outputItem.ItemType != ItemType.DigitalOutput)
            {
                await context.DisposeAsync();
                return (false, "Digital input requires DigitalOutput as output item");
            }

            // Validate InputItemId != OutputItemId
            if (memory.InputItemId == memory.OutputItemId)
            {
                await context.DisposeAsync();
                return (false, "Input and output items must be different");
            }

            // Validate Interval > 0
            if (memory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, "Interval must be greater than 0");
            }

            // Validate analog-specific parameters
            if (inputIsAnalog)
            {
                if (memory.Deadband < 0)
                {
                    await context.DisposeAsync();
                    return (false, "Deadband must be 0 or greater");
                }

                if (memory.DeadbandType == DeadbandType.Percentage)
                {
                    if (memory.Deadband > 100)
                    {
                        await context.DisposeAsync();
                        return (false, "Percentage deadband must be between 0 and 100");
                    }

                    if (memory.InputMax <= memory.InputMin)
                    {
                        await context.DisposeAsync();
                        return (false, "Input max must be greater than input min for percentage deadband");
                    }
                }
            }

            // Validate digital-specific parameters
            if (!inputIsAnalog)
            {
                if (memory.StabilityTime < 0)
                {
                    await context.DisposeAsync();
                    return (false, "Stability time must be 0 or greater");
                }
            }

            // Check if configuration changed significantly - if so, reset state
            bool configChanged = existingMemory.InputItemId != memory.InputItemId ||
                                 existingMemory.DeadbandType != memory.DeadbandType ||
                                 existingMemory.Interval != memory.Interval;

            if (configChanged)
            {
                // Reset state
                memory.LastOutputValue = null;
                memory.LastInputValue = null;
                memory.LastChangeTime = null;
                memory.PendingDigitalState = null;
                memory.LastTimestamp = null;

                MyLog.Info("Deadband memory configuration changed, resetting state", new Dictionary<string, object?>
                {
                    ["MemoryId"] = memory.Id,
                    ["MemoryName"] = memory.Name
                });
            }

            // Detach the tracked entity and update with new values
            context.Entry(existingMemory).State = EntityState.Detached;
            context.DeadbandMemories.Update(memory);
            await context.SaveChangesAsync();
            
            await context.DisposeAsync();
            return (true, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to edit deadband memory", ex, new Dictionary<string, object?>
            {
                ["DeadbandMemory"] = memory
            });
            return (false, $"Exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Delete a deadband memory configuration
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> DeleteDeadbandMemory(Guid id)
    {
        try
        {
            var context = new DataContext();
            var memory = await context.DeadbandMemories.FindAsync(id);
            
            if (memory == null)
            {
                await context.DisposeAsync();
                return (false, "Deadband memory not found");
            }

            context.DeadbandMemories.Remove(memory);
            await context.SaveChangesAsync();
            
            await context.DisposeAsync();
            return (true, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to delete deadband memory", ex, new Dictionary<string, object?>
            {
                ["Id"] = id
            });
            return (false, $"Exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Reset a deadband memory's state
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> ResetDeadbandMemory(Guid id)
    {
        try
        {
            var context = new DataContext();
            var memory = await context.DeadbandMemories.FindAsync(id);
            
            if (memory == null)
            {
                await context.DisposeAsync();
                return (false, "Deadband memory not found");
            }

            // Reset state
            memory.LastOutputValue = null;
            memory.LastInputValue = null;
            memory.LastChangeTime = null;
            memory.PendingDigitalState = null;
            memory.LastTimestamp = null;

            context.DeadbandMemories.Update(memory);
            await context.SaveChangesAsync();
            
            // Write zero/false to output item
            await Points.WriteOrAddValue(memory.OutputItemId, "0");
            
            await context.DisposeAsync();
            
            MyLog.Info("Deadband memory reset", new Dictionary<string, object?>
            {
                ["Id"] = id,
                ["Name"] = memory.Name
            });
            
            return (true, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to reset deadband memory", ex, new Dictionary<string, object?>
            {
                ["Id"] = id
            });
            return (false, $"Exception: {ex.Message}");
        }
    }
}
