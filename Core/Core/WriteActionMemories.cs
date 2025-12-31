using System.Linq.Expressions;
using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Provides CRUD operations for WriteActionMemory configurations.
/// </summary>
public class WriteActionMemories
{
    /// <summary>
    /// Get all write action memory configurations.
    /// </summary>
    public static async Task<List<WriteActionMemory>?> GetWriteActionMemories()
    {
        var context = new DataContext();
        var found = await context.WriteActionMemories.ToListAsync();
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Get a specific write action memory by predicate.
    /// </summary>
    public static async Task<WriteActionMemory?> GetWriteActionMemory(
        Expression<Func<WriteActionMemory, bool>> predicate)
    {
        var context = new DataContext();
        var found = await context.WriteActionMemories.FirstOrDefaultAsync(predicate);
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Add a new write action memory configuration with comprehensive validation.
    /// </summary>
    public static async Task<(bool Success, Guid? Id, string? ErrorMessage)> AddWriteActionMemory(
        WriteActionMemory memory)
    {
        try
        {
            var context = new DataContext();

            // ===== VALIDATION =====
            
            // 1. Validate OutputItem exists
            var outputItem = await context.MonitoringItems.FindAsync(memory.OutputItemId);
            if (outputItem == null)
            {
                await context.DisposeAsync();
                return (false, null, "Output item not found");
            }

            // 2. Validate OutputItem type (AnalogOutput = 4 or DigitalOutput = 2)
            if (outputItem.ItemType != ItemType.AnalogOutput && 
                outputItem.ItemType != ItemType.DigitalOutput)
            {
                await context.DisposeAsync();
                return (false, null, "Output item must be AnalogOutput or DigitalOutput");
            }

            // 3. Validate InputItem exists
            var inputItem = await context.MonitoringItems.FindAsync(memory.InputItemId);
            if (inputItem == null)
            {
                await context.DisposeAsync();
                return (false, null, "Input item not found");
            }

            // 4. Validate input != output
            if (memory.InputItemId == memory.OutputItemId)
            {
                await context.DisposeAsync();
                return (false, null, "Input and output items must be different");
            }

            // 5. Validate exactly one of OutputValue or OutputValueSourceItemId is provided
            bool hasStaticValue = !string.IsNullOrEmpty(memory.OutputValue);
            bool hasDynamicSource = memory.OutputValueSourceItemId.HasValue;

            if (!hasStaticValue && !hasDynamicSource)
            {
                await context.DisposeAsync();
                return (false, null, "Either OutputValue (static) or OutputValueSourceItemId (dynamic) must be provided");
            }

            if (hasStaticValue && hasDynamicSource)
            {
                await context.DisposeAsync();
                return (false, null, "Cannot specify both OutputValue and OutputValueSourceItemId - choose either static or dynamic mode");
            }

            // 6. If OutputValueSourceItemId is set, validate it exists and differs from input/output
            if (memory.OutputValueSourceItemId.HasValue)
            {
                var sourceItem = await context.MonitoringItems.FindAsync(memory.OutputValueSourceItemId.Value);
                if (sourceItem == null)
                {
                    await context.DisposeAsync();
                    return (false, null, "Output value source item not found");
                }

                if (memory.OutputValueSourceItemId.Value == memory.InputItemId)
                {
                    await context.DisposeAsync();
                    return (false, null, "Output value source item must be different from input item");
                }

                if (memory.OutputValueSourceItemId.Value == memory.OutputItemId)
                {
                    await context.DisposeAsync();
                    return (false, null, "Output value source item must be different from output item");
                }
            }

            // 7. Validate interval
            if (memory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, null, "Interval must be greater than 0");
            }

            // 8. Validate duration
            if (memory.Duration < 0)
            {
                await context.DisposeAsync();
                return (false, null, "Duration must be greater than or equal to 0");
            }

            // 9. Validate MaxExecutionCount if set
            if (memory.MaxExecutionCount.HasValue && memory.MaxExecutionCount.Value <= 0)
            {
                await context.DisposeAsync();
                return (false, null, "MaxExecutionCount must be greater than 0 when specified");
            }

            // 10. Reset CurrentExecutionCount to 0 on add
            memory.CurrentExecutionCount = 0;

            // ===== ADD TO DATABASE =====
            context.WriteActionMemories.Add(memory);
            await context.SaveChangesAsync();

            MyLog.Info("WriteActionMemory added successfully", new Dictionary<string, object?>
            {
                ["Id"] = memory.Id,
                ["Name"] = memory.Name,
                ["InputItemId"] = memory.InputItemId,
                ["OutputItemId"] = memory.OutputItemId,
                ["HasStaticValue"] = hasStaticValue,
                ["HasDynamicSource"] = hasDynamicSource
            });

            await context.DisposeAsync();
            return (true, memory.Id, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to add WriteActionMemory", ex, new Dictionary<string, object?>
            {
                ["Memory"] = memory
            });
            return (false, null, $"Exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Edit an existing write action memory configuration with optional execution count reset.
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> EditWriteActionMemory(
        WriteActionMemory memory, bool resetExecutionCount = false)
    {
        try
        {
            var context = new DataContext();

            // 1. Check if exists
            var existing = await context.WriteActionMemories.FindAsync(memory.Id);
            if (existing == null)
            {
                await context.DisposeAsync();
                return (false, "WriteActionMemory not found");
            }

            // 2. Run same validations as Add
            var outputItem = await context.MonitoringItems.FindAsync(memory.OutputItemId);
            if (outputItem == null)
            {
                await context.DisposeAsync();
                return (false, "Output item not found");
            }

            if (outputItem.ItemType != ItemType.AnalogOutput && 
                outputItem.ItemType != ItemType.DigitalOutput)
            {
                await context.DisposeAsync();
                return (false, "Output item must be AnalogOutput or DigitalOutput");
            }

            var inputItem = await context.MonitoringItems.FindAsync(memory.InputItemId);
            if (inputItem == null)
            {
                await context.DisposeAsync();
                return (false, "Input item not found");
            }

            if (memory.InputItemId == memory.OutputItemId)
            {
                await context.DisposeAsync();
                return (false, "Input and output items must be different");
            }

            bool hasStaticValue = !string.IsNullOrEmpty(memory.OutputValue);
            bool hasDynamicSource = memory.OutputValueSourceItemId.HasValue;

            if (!hasStaticValue && !hasDynamicSource)
            {
                await context.DisposeAsync();
                return (false, "Either OutputValue (static) or OutputValueSourceItemId (dynamic) must be provided");
            }

            if (hasStaticValue && hasDynamicSource)
            {
                await context.DisposeAsync();
                return (false, "Cannot specify both OutputValue and OutputValueSourceItemId - choose either static or dynamic mode");
            }

            if (memory.OutputValueSourceItemId.HasValue)
            {
                var sourceItem = await context.MonitoringItems.FindAsync(memory.OutputValueSourceItemId.Value);
                if (sourceItem == null)
                {
                    await context.DisposeAsync();
                    return (false, "Output value source item not found");
                }

                if (memory.OutputValueSourceItemId.Value == memory.InputItemId)
                {
                    await context.DisposeAsync();
                    return (false, "Output value source item must be different from input item");
                }

                if (memory.OutputValueSourceItemId.Value == memory.OutputItemId)
                {
                    await context.DisposeAsync();
                    return (false, "Output value source item must be different from output item");
                }
            }

            if (memory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, "Interval must be greater than 0");
            }

            if (memory.Duration < 0)
            {
                await context.DisposeAsync();
                return (false, "Duration must be greater than or equal to 0");
            }

            if (memory.MaxExecutionCount.HasValue && memory.MaxExecutionCount.Value <= 0)
            {
                await context.DisposeAsync();
                return (false, "MaxExecutionCount must be greater than 0 when specified");
            }

            // 3. Reset execution count if requested
            if (resetExecutionCount)
            {
                memory.CurrentExecutionCount = 0;
                MyLog.Info("Execution count reset for WriteActionMemory", new Dictionary<string, object?>
                {
                    ["Id"] = memory.Id
                });
            }

            // 4. Update
            context.Entry(existing).State = EntityState.Detached;
            context.WriteActionMemories.Update(memory);
            await context.SaveChangesAsync();

            // 5. Invalidate processor cache
            WriteActionMemoryProcess.Instance.InvalidateCache(memory.Id);

            MyLog.Info("WriteActionMemory edited successfully", new Dictionary<string, object?>
            {
                ["Id"] = memory.Id,
                ["ResetExecutionCount"] = resetExecutionCount
            });

            await context.DisposeAsync();
            return (true, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to edit WriteActionMemory", ex, new Dictionary<string, object?>
            {
                ["Memory"] = memory
            });
            return (false, $"Exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Delete a write action memory configuration.
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> DeleteWriteActionMemory(Guid id)
    {
        try
        {
            var context = new DataContext();
            var memory = await context.WriteActionMemories.FindAsync(id);
            
            if (memory == null)
            {
                await context.DisposeAsync();
                return (false, "WriteActionMemory not found");
            }

            context.WriteActionMemories.Remove(memory);
            await context.SaveChangesAsync();

            // Invalidate processor cache
            WriteActionMemoryProcess.Instance.InvalidateCache(id);

            MyLog.Info("WriteActionMemory deleted successfully", new Dictionary<string, object?>
            {
                ["Id"] = id
            });

            await context.DisposeAsync();
            return (true, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to delete WriteActionMemory", ex, new Dictionary<string, object?>
            {
                ["Id"] = id
            });
            return (false, $"Exception: {ex.Message}");
        }
    }
}
