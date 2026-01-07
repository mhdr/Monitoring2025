using System.Linq.Expressions;
using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Helper class for ScheduleMemory CRUD operations
/// </summary>
public class ScheduleMemories
{
    /// <summary>
    /// Get all schedule memory configurations with their blocks
    /// </summary>
    public static async Task<List<ScheduleMemory>?> GetScheduleMemories()
    {
        var context = new DataContext();
        var found = await context.ScheduleMemories
            .Include(m => m.ScheduleBlocks)
            .Include(m => m.HolidayCalendar)
            .ToListAsync();
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Get a specific schedule memory by predicate with blocks
    /// </summary>
    public static async Task<ScheduleMemory?> GetScheduleMemory(Expression<Func<ScheduleMemory, bool>> predicate)
    {
        var context = new DataContext();
        var found = await context.ScheduleMemories
            .Include(m => m.ScheduleBlocks)
            .Include(m => m.HolidayCalendar)
            .ThenInclude(c => c!.Dates)
            .FirstOrDefaultAsync(predicate);
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Add a new schedule memory configuration with blocks
    /// </summary>
    public static async Task<(bool Success, Guid? Id, string? ErrorMessage)> AddScheduleMemory(ScheduleMemory scheduleMemory)
    {
        try
        {
            var context = new DataContext();
            
            // Validate output based on OutputType
            bool isAnalogOutput = false;
            
            if (scheduleMemory.OutputType == ScheduleSourceType.Point)
            {
                // Validate OutputReference is a valid GUID for Point type
                if (!Guid.TryParse(scheduleMemory.OutputReference, out var outputItemId))
                {
                    await context.DisposeAsync();
                    return (false, null, "Invalid output item ID format");
                }
                
                // Validate OutputItem exists
                var outputItem = await context.MonitoringItems.FindAsync(outputItemId);
                if (outputItem == null)
                {
                    await context.DisposeAsync();
                    return (false, null, "Output item not found");
                }

                // Validate OutputItem is AnalogOutput or DigitalOutput
                if (outputItem.ItemType != ItemType.AnalogOutput && outputItem.ItemType != ItemType.DigitalOutput)
                {
                    await context.DisposeAsync();
                    return (false, null, "Output item must be AnalogOutput or DigitalOutput");
                }
                
                isAnalogOutput = outputItem.ItemType == ItemType.AnalogOutput;
            }
            else if (scheduleMemory.OutputType == ScheduleSourceType.GlobalVariable)
            {
                // Validate GlobalVariable exists
                var globalVariable = await context.GlobalVariables.FirstOrDefaultAsync(gv => gv.Name == scheduleMemory.OutputReference);
                if (globalVariable == null)
                {
                    await context.DisposeAsync();
                    return (false, null, "Global variable not found");
                }
                
                // For global variables, Float = Analog, Boolean = Digital
                isAnalogOutput = globalVariable.VariableType == GlobalVariableType.Float;
            }
            else
            {
                await context.DisposeAsync();
                return (false, null, "Invalid output type");
            }

            // Validate Interval > 0
            if (scheduleMemory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, null, "Interval must be greater than 0");
            }

            // Validate duration
            if (scheduleMemory.Duration < 0)
            {
                await context.DisposeAsync();
                return (false, null, "Duration must be greater than or equal to 0");
            }

            // Validate HolidayCalendar exists if referenced
            if (scheduleMemory.HolidayCalendarId.HasValue)
            {
                var calendar = await context.HolidayCalendars.FindAsync(scheduleMemory.HolidayCalendarId.Value);
                if (calendar == null)
                {
                    await context.DisposeAsync();
                    return (false, null, "Holiday calendar not found");
                }
            }

            // Validate default value based on output type
            if (isAnalogOutput)
            {
                // For analog output, default analog value should be set (digital value ignored)
                scheduleMemory.DefaultDigitalValue = null;
            }
            else
            {
                // For digital output, default digital value should be set (analog value ignored)
                scheduleMemory.DefaultAnalogValue = null;
            }

            // Validate schedule blocks if provided
            if (scheduleMemory.ScheduleBlocks != null && scheduleMemory.ScheduleBlocks.Count > 0)
            {
                var blockValidation = ValidateScheduleBlocks(scheduleMemory.ScheduleBlocks.ToList(), isAnalogOutput);
                if (!blockValidation.Success)
                {
                    await context.DisposeAsync();
                    return (false, null, blockValidation.ErrorMessage);
                }
            }

            context.ScheduleMemories.Add(scheduleMemory);
            await context.SaveChangesAsync();
            
            await context.DisposeAsync();
            return (true, scheduleMemory.Id, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to add schedule memory", ex, new Dictionary<string, object?>
            {
                ["ScheduleMemory"] = scheduleMemory
            });
            return (false, null, $"Exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Edit an existing schedule memory configuration
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> EditScheduleMemory(ScheduleMemory scheduleMemory)
    {
        try
        {
            var context = new DataContext();

            // Check if memory exists
            var existingMemory = await context.ScheduleMemories
                .Include(m => m.ScheduleBlocks)
                .FirstOrDefaultAsync(m => m.Id == scheduleMemory.Id);
            if (existingMemory == null)
            {
                await context.DisposeAsync();
                return (false, "Schedule memory not found");
            }
            
            // Validate output based on OutputType
            bool isAnalogOutput = false;
            
            if (scheduleMemory.OutputType == ScheduleSourceType.Point)
            {
                // Validate OutputReference is a valid GUID for Point type
                if (!Guid.TryParse(scheduleMemory.OutputReference, out var outputItemId))
                {
                    await context.DisposeAsync();
                    return (false, "Invalid output item ID format");
                }
                
                // Validate OutputItem exists
                var outputItem = await context.MonitoringItems.FindAsync(outputItemId);
                if (outputItem == null)
                {
                    await context.DisposeAsync();
                    return (false, "Output item not found");
                }

                // Validate OutputItem is AnalogOutput or DigitalOutput
                if (outputItem.ItemType != ItemType.AnalogOutput && outputItem.ItemType != ItemType.DigitalOutput)
                {
                    await context.DisposeAsync();
                    return (false, "Output item must be AnalogOutput or DigitalOutput");
                }
                
                isAnalogOutput = outputItem.ItemType == ItemType.AnalogOutput;
            }
            else if (scheduleMemory.OutputType == ScheduleSourceType.GlobalVariable)
            {
                // Validate GlobalVariable exists
                var globalVariable = await context.GlobalVariables.FirstOrDefaultAsync(gv => gv.Name == scheduleMemory.OutputReference);
                if (globalVariable == null)
                {
                    await context.DisposeAsync();
                    return (false, "Global variable not found");
                }
                
                // For global variables, Float = Analog, Boolean = Digital
                isAnalogOutput = globalVariable.VariableType == GlobalVariableType.Float;
            }
            else
            {
                await context.DisposeAsync();
                return (false, "Invalid output type");
            }

            // Validate Interval > 0
            if (scheduleMemory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, "Interval must be greater than 0");
            }

            // Validate duration
            if (scheduleMemory.Duration < 0)
            {
                await context.DisposeAsync();
                return (false, "Duration must be greater than or equal to 0");
            }

            // Validate HolidayCalendar exists if referenced
            if (scheduleMemory.HolidayCalendarId.HasValue)
            {
                var calendar = await context.HolidayCalendars.FindAsync(scheduleMemory.HolidayCalendarId.Value);
                if (calendar == null)
                {
                    await context.DisposeAsync();
                    return (false, "Holiday calendar not found");
                }
            }

            // Validate default value based on output type
            if (isAnalogOutput)
            {
                scheduleMemory.DefaultDigitalValue = null;
            }
            else
            {
                scheduleMemory.DefaultAnalogValue = null;
            }

            // Validate schedule blocks if provided
            if (scheduleMemory.ScheduleBlocks != null && scheduleMemory.ScheduleBlocks.Count > 0)
            {
                var blockValidation = ValidateScheduleBlocks(scheduleMemory.ScheduleBlocks.ToList(), isAnalogOutput);
                if (!blockValidation.Success)
                {
                    await context.DisposeAsync();
                    return (false, blockValidation.ErrorMessage);
                }
            }

            // Remove existing blocks and add new ones
            if (existingMemory.ScheduleBlocks != null)
            {
                context.ScheduleBlocks.RemoveRange(existingMemory.ScheduleBlocks);
            }

            // Update properties
            existingMemory.Name = scheduleMemory.Name;
            existingMemory.OutputType = scheduleMemory.OutputType;
            existingMemory.OutputReference = scheduleMemory.OutputReference;
            existingMemory.Interval = scheduleMemory.Interval;
            existingMemory.IsDisabled = scheduleMemory.IsDisabled;
            existingMemory.Duration = scheduleMemory.Duration;
            existingMemory.HolidayCalendarId = scheduleMemory.HolidayCalendarId;
            existingMemory.DefaultAnalogValue = scheduleMemory.DefaultAnalogValue;
            existingMemory.DefaultDigitalValue = scheduleMemory.DefaultDigitalValue;

            // Add new blocks
            if (scheduleMemory.ScheduleBlocks != null)
            {
                foreach (var block in scheduleMemory.ScheduleBlocks)
                {
                    block.ScheduleMemoryId = existingMemory.Id;
                    context.ScheduleBlocks.Add(block);
                }
            }

            await context.SaveChangesAsync();
            await context.DisposeAsync();
            return (true, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to edit schedule memory", ex, new Dictionary<string, object?>
            {
                ["ScheduleMemory"] = scheduleMemory
            });
            return (false, $"Exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Delete a schedule memory configuration (cascade deletes blocks)
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> DeleteScheduleMemory(Guid id)
    {
        try
        {
            var context = new DataContext();
            var memory = await context.ScheduleMemories.FindAsync(id);
            if (memory == null)
            {
                await context.DisposeAsync();
                return (false, "Schedule memory not found");
            }

            context.ScheduleMemories.Remove(memory);
            await context.SaveChangesAsync();
            
            await context.DisposeAsync();
            return (true, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to delete schedule memory", ex, new Dictionary<string, object?>
            {
                ["Id"] = id
            });
            return (false, $"Exception: {ex.Message}");
        }
    }

    /// </summary>
    private static (bool Success, string? ErrorMessage) ValidateScheduleBlocks(List<ScheduleBlock> blocks, bool isAnalogOutput)
    {
        foreach (var block in blocks)
        {
            // Validate exactly one output value is set
            bool hasAnalog = block.AnalogOutputValue.HasValue;
            bool hasDigital = block.DigitalOutputValue.HasValue;

            if (isAnalogOutput)
            {
                if (!hasAnalog)
                {
                    return (false, $"Block '{block.Description ?? block.Id.ToString()}': Analog output value is required for AnalogOutput items");
                }
                block.DigitalOutputValue = null; // Clear digital value for analog output
            }
            else
            {
                if (!hasDigital)
                {
                    return (false, $"Block '{block.Description ?? block.Id.ToString()}': Digital output value is required for DigitalOutput items");
                }
                block.AnalogOutputValue = null; // Clear analog value for digital output
            }

            // Validate time range
            if (block.EndTime.HasValue)
            {
                // Validate zero duration blocks
                if (block.StartTime == block.EndTime.Value)
                {
                    return (false, $"Block '{block.Description ?? block.Id.ToString()}': Cannot have zero duration (start == end time)");
                }
                
                // Validate end time is within 24 hours (allow cross-midnight blocks where StartTime > EndTime)
                if (block.EndTime.Value.TotalHours < 0 || block.EndTime.Value.TotalHours > 24)
                {
                    return (false, $"Block '{block.Description ?? block.Id.ToString()}': End time must be within 00:00:00 to 24:00:00");
                }
            }

            // Validate start time is within 24 hours
            if (block.StartTime.TotalHours < 0 || block.StartTime.TotalHours >= 24)
            {
                return (false, $"Block '{block.Description ?? block.Id.ToString()}': Start time must be within 00:00:00 to 24:00:00");
            }
        }

        // Check for overlapping blocks on same day with same priority
        // For cross-midnight blocks, treat them as two ranges for overlap detection
        foreach (var day in Enum.GetValues<ScheduleDayOfWeek>())
        {
            foreach (var priority in blocks.Select(b => b.Priority).Distinct())
            {
                var dayBlocks = blocks
                    .Where(b => b.DayOfWeek == day && b.Priority == priority)
                    .ToList();
                
                if (dayBlocks.Count <= 1)
                    continue;
                
                // Create effective time ranges for overlap checking
                var ranges = new List<(TimeSpan Start, TimeSpan End, string Description)>();
                
                foreach (var block in dayBlocks)
                {
                    if (!block.EndTime.HasValue)
                    {
                        // Null EndTime: treat based on behavior
                        if (block.NullEndTimeBehavior == NullEndTimeBehavior.ExtendToEndOfDay)
                        {
                            ranges.Add((block.StartTime, TimeSpan.FromHours(24), block.Description ?? block.Id.ToString()));
                        }
                        // UseDefault behavior doesn't need overlap check (immediate end)
                    }
                    else if (block.StartTime < block.EndTime.Value)
                    {
                        // Normal block (doesn't cross midnight)
                        ranges.Add((block.StartTime, block.EndTime.Value, block.Description ?? block.Id.ToString()));
                    }
                    else
                    {
                        // Cross-midnight block: split into two ranges
                        ranges.Add((block.StartTime, TimeSpan.FromHours(24), block.Description ?? block.Id.ToString() + " (before midnight)"));
                        ranges.Add((TimeSpan.Zero, block.EndTime.Value, block.Description ?? block.Id.ToString() + " (after midnight)"));
                    }
                }
                
                // Check overlaps in effective ranges
                var sorted = ranges.OrderBy(r => r.Start).ToList();
                for (int i = 0; i < sorted.Count - 1; i++)
                {
                    if (sorted[i].End > sorted[i + 1].Start)
                    {
                        return (false, $"Overlapping schedule blocks detected on {day} with priority {priority}: '{sorted[i].Description}' and '{sorted[i + 1].Description}'");
                    }
                }
            }
        }

        return (true, null);
    }
}
