using System.Linq.Expressions;
using Cronos;
using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Helper class for TotalizerMemory CRUD operations
/// </summary>
public class TotalizerMemories
{
    /// <summary>
    /// Get all totalizer memory configurations
    /// </summary>
    public static async Task<List<TotalizerMemory>?> GetTotalizerMemories()
    {
        var context = new DataContext();
        var found = await context.TotalizerMemories.ToListAsync();
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Get a specific totalizer memory by predicate
    /// </summary>
    public static async Task<TotalizerMemory?> GetTotalizerMemory(Expression<Func<TotalizerMemory, bool>> predicate)
    {
        var context = new DataContext();
        var found = await context.TotalizerMemories.FirstOrDefaultAsync(predicate);
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Add a new totalizer memory configuration
    /// </summary>
    public static async Task<(bool Success, Guid? Id, string? ErrorMessage)> AddTotalizerMemory(TotalizerMemory totalizerMemory)
    {
        try
        {
            var context = new DataContext();
            
            // Validate Input source
            if (totalizerMemory.InputType == TotalizerSourceType.Point)
            {
                if (!Guid.TryParse(totalizerMemory.InputReference, out var inputItemId))
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

                // Validate InputItem type based on AccumulationType
                if (totalizerMemory.AccumulationType == AccumulationType.RateIntegration)
                {
                    if (inputItem.ItemType != ItemType.AnalogInput)
                    {
                        await context.DisposeAsync();
                        return (false, null, "Input item must be AnalogInput for rate integration");
                    }
                }
                else // Event counting modes
                {
                    if (inputItem.ItemType != ItemType.DigitalInput)
                    {
                        await context.DisposeAsync();
                        return (false, null, "Input item must be DigitalInput for event counting");
                    }
                }
            }
            else if (totalizerMemory.InputType == TotalizerSourceType.GlobalVariable)
            {
                var inputVariable = await GlobalVariables.GetGlobalVariableByName(totalizerMemory.InputReference);
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
            if (totalizerMemory.OutputType == TotalizerSourceType.Point)
            {
                if (!Guid.TryParse(totalizerMemory.OutputReference, out var outputItemId))
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

                // Validate OutputItem is AnalogOutput
                if (outputItem.ItemType != ItemType.AnalogOutput)
                {
                    await context.DisposeAsync();
                    return (false, null, "Output item must be AnalogOutput");
                }
            }
            else if (totalizerMemory.OutputType == TotalizerSourceType.GlobalVariable)
            {
                var outputVariable = await GlobalVariables.GetGlobalVariableByName(totalizerMemory.OutputReference);
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
            if (totalizerMemory.InputType == totalizerMemory.OutputType && 
                totalizerMemory.InputReference == totalizerMemory.OutputReference)
            {
                await context.DisposeAsync();
                return (false, null, "Input and output sources must be different");
            }

            // Validate Interval > 0
            if (totalizerMemory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, null, "Interval must be greater than 0");
            }

            // Validate overflow threshold if reset on overflow is enabled
            if (totalizerMemory.ResetOnOverflow)
            {
                if (!totalizerMemory.OverflowThreshold.HasValue || totalizerMemory.OverflowThreshold.Value <= 0)
                {
                    await context.DisposeAsync();
                    return (false, null, "Overflow threshold must be greater than 0 when reset on overflow is enabled");
                }
            }

            // Validate cron expression if scheduled reset is enabled
            if (totalizerMemory.ScheduledResetEnabled)
            {
                if (string.IsNullOrWhiteSpace(totalizerMemory.ResetCron))
                {
                    await context.DisposeAsync();
                    return (false, null, "Cron expression is required when scheduled reset is enabled");
                }

                try
                {
                    CronExpression.Parse(totalizerMemory.ResetCron);
                }
                catch (Exception ex)
                {
                    await context.DisposeAsync();
                    return (false, null, $"Invalid cron expression: {ex.Message}");
                }
            }

            // Validate decimal places
            if (totalizerMemory.DecimalPlaces < 0 || totalizerMemory.DecimalPlaces > 10)
            {
                await context.DisposeAsync();
                return (false, null, "Decimal places must be between 0 and 10");
            }

            context.TotalizerMemories.Add(totalizerMemory);
            await context.SaveChangesAsync();
            var id = totalizerMemory.Id;
            await context.DisposeAsync();
            
            // Invalidate usage cache for referenced global variables
            await GlobalVariableUsageCache.OnMemoryChanged(id, "TotalizerMemory");
            
            return (true, id, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to add totalizer memory", ex, new Dictionary<string, object?>
            {
                ["TotalizerMemory"] = totalizerMemory
            });
            return (false, null, $"Exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Edit an existing totalizer memory configuration
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> EditTotalizerMemory(TotalizerMemory totalizerMemory)
    {
        try
        {
            var context = new DataContext();
            
            // Validate totalizer memory exists
            var existing = await context.TotalizerMemories.AsNoTracking().FirstOrDefaultAsync(t => t.Id == totalizerMemory.Id);
            if (existing == null)
            {
                await context.DisposeAsync();
                return (false, "Totalizer memory not found");
            }
            
            // Validate Input source
            if (totalizerMemory.InputType == TotalizerSourceType.Point)
            {
                if (!Guid.TryParse(totalizerMemory.InputReference, out var inputItemId))
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

                // Validate InputItem type based on AccumulationType
                if (totalizerMemory.AccumulationType == AccumulationType.RateIntegration)
                {
                    if (inputItem.ItemType != ItemType.AnalogInput)
                    {
                        await context.DisposeAsync();
                        return (false, "Input item must be AnalogInput for rate integration");
                    }
                }
                else // Event counting modes
                {
                    if (inputItem.ItemType != ItemType.DigitalInput)
                    {
                        await context.DisposeAsync();
                        return (false, "Input item must be DigitalInput for event counting");
                    }
                }
            }
            else if (totalizerMemory.InputType == TotalizerSourceType.GlobalVariable)
            {
                var inputVariable = await GlobalVariables.GetGlobalVariableByName(totalizerMemory.InputReference);
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
            if (totalizerMemory.OutputType == TotalizerSourceType.Point)
            {
                if (!Guid.TryParse(totalizerMemory.OutputReference, out var outputItemId))
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

                // Validate OutputItem is AnalogOutput
                if (outputItem.ItemType != ItemType.AnalogOutput)
                {
                    await context.DisposeAsync();
                    return (false, "Output item must be AnalogOutput");
                }
            }
            else if (totalizerMemory.OutputType == TotalizerSourceType.GlobalVariable)
            {
                var outputVariable = await GlobalVariables.GetGlobalVariableByName(totalizerMemory.OutputReference);
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
            if (totalizerMemory.InputType == totalizerMemory.OutputType && 
                totalizerMemory.InputReference == totalizerMemory.OutputReference)
            {
                await context.DisposeAsync();
                return (false, "Input and output sources must be different");
            }

            // Validate Interval > 0
            if (totalizerMemory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, "Interval must be greater than 0");
            }

            // Validate overflow threshold if reset on overflow is enabled
            if (totalizerMemory.ResetOnOverflow)
            {
                if (!totalizerMemory.OverflowThreshold.HasValue || totalizerMemory.OverflowThreshold.Value <= 0)
                {
                    await context.DisposeAsync();
                    return (false, "Overflow threshold must be greater than 0 when reset on overflow is enabled");
                }
            }

            // Validate cron expression if scheduled reset is enabled
            if (totalizerMemory.ScheduledResetEnabled)
            {
                if (string.IsNullOrWhiteSpace(totalizerMemory.ResetCron))
                {
                    await context.DisposeAsync();
                    return (false, "Cron expression is required when scheduled reset is enabled");
                }

                try
                {
                    CronExpression.Parse(totalizerMemory.ResetCron);
                }
                catch (Exception ex)
                {
                    await context.DisposeAsync();
                    return (false, $"Invalid cron expression: {ex.Message}");
                }
            }

            // Validate decimal places
            if (totalizerMemory.DecimalPlaces < 0 || totalizerMemory.DecimalPlaces > 10)
            {
                await context.DisposeAsync();
                return (false, "Decimal places must be between 0 and 10");
            }

            context.TotalizerMemories.Update(totalizerMemory);
            await context.SaveChangesAsync();
            
            await context.DisposeAsync();
            
            // Invalidate usage cache for referenced global variables
            await GlobalVariableUsageCache.OnMemoryChanged(totalizerMemory.Id, "TotalizerMemory");
            
            return (true, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to edit totalizer memory", ex, new Dictionary<string, object?>
            {
                ["TotalizerMemory"] = totalizerMemory
            });
            return (false, $"Exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Delete a totalizer memory configuration
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> DeleteTotalizerMemory(Guid id)
    {
        try
        {
            var context = new DataContext();
            var totalizerMemory = await context.TotalizerMemories.FindAsync(id);
            
            if (totalizerMemory == null)
            {
                await context.DisposeAsync();
                return (false, "Totalizer memory not found");
            }

            context.TotalizerMemories.Remove(totalizerMemory);
            await context.SaveChangesAsync();
            
            await context.DisposeAsync();
            
            // Invalidate usage cache for referenced global variables
            await GlobalVariableUsageCache.OnMemoryChanged(id, "TotalizerMemory");
            
            return (true, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to delete totalizer memory", ex, new Dictionary<string, object?>
            {
                ["Id"] = id
            });
            return (false, $"Exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Reset a totalizer memory's accumulated value (manual reset)
    /// </summary>
    /// <param name="id">Totalizer memory ID</param>
    /// <param name="preserveInDatabase">If true, keeps accumulated value in database but zeros output</param>
    public static async Task<(bool Success, string? ErrorMessage)> ResetTotalizerMemory(Guid id, bool preserveInDatabase = false)
    {
        try
        {
            var context = new DataContext();
            var totalizerMemory = await context.TotalizerMemories.FindAsync(id);
            
            if (totalizerMemory == null)
            {
                await context.DisposeAsync();
                return (false, "Totalizer memory not found");
            }

            // Check if manual reset is enabled
            if (!totalizerMemory.ManualResetEnabled)
            {
                await context.DisposeAsync();
                return (false, "Manual reset is not enabled for this totalizer");
            }

            // Reset accumulated value unless preserving
            if (!preserveInDatabase)
            {
                totalizerMemory.AccumulatedValue = 0.0;
            }
            
            // Reset tracking values
            totalizerMemory.LastInputValue = null;
            totalizerMemory.LastEventState = null;
            totalizerMemory.LastResetTime = DateTime.UtcNow;

            context.TotalizerMemories.Update(totalizerMemory);
            await context.SaveChangesAsync();
            
            // Write zero to output based on source type
            if (totalizerMemory.OutputType == TotalizerSourceType.Point)
            {
                if (Guid.TryParse(totalizerMemory.OutputReference, out var outputItemId))
                {
                    await Points.WriteOrAddValue(outputItemId, "0");
                }
            }
            else if (totalizerMemory.OutputType == TotalizerSourceType.GlobalVariable)
            {
                await GlobalVariableProcess.SetVariable(totalizerMemory.OutputReference, "0");
            }
            
            await context.DisposeAsync();
            
            MyLog.Info("Totalizer memory reset", new Dictionary<string, object?>
            {
                ["Id"] = id,
                ["Name"] = totalizerMemory.Name,
                ["PreserveInDatabase"] = preserveInDatabase
            });
            
            return (true, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to reset totalizer memory", ex, new Dictionary<string, object?>
            {
                ["Id"] = id
            });
            return (false, $"Exception: {ex.Message}");
        }
    }
}
