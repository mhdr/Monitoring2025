using System.Linq.Expressions;
using System.Text.Json;
using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Helper class for AverageMemory CRUD operations
/// </summary>
public class AverageMemories
{
    /// <summary>
    /// Get all average memory configurations
    /// </summary>
    public static async Task<List<AverageMemory>?> GetAverageMemories()
    {
        var context = new DataContext();
        var found = await context.AverageMemories.ToListAsync();
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Get a specific average memory by predicate
    /// </summary>
    public static async Task<AverageMemory?> GetAverageMemory(Expression<Func<AverageMemory, bool>> predicate)
    {
        var context = new DataContext();
        var found = await context.AverageMemories.FirstOrDefaultAsync(predicate);
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Add a new average memory configuration
    /// </summary>
    public static async Task<(bool Success, Guid? Id, string? ErrorMessage)> AddAverageMemory(AverageMemory averageMemory)
    {
        try
        {
            var context = new DataContext();

            // Validate input sources (mixed Points and Global Variables)
            var (inputSuccess, inputError, inputSources) = await AverageMemoryValidator.ValidateInputSources(
                averageMemory.InputItemIds, context);
            if (!inputSuccess)
            {
                await context.DisposeAsync();
                return (false, null, inputError);
            }

            // Validate output source
            var (outputSuccess, outputError) = await AverageMemoryValidator.ValidateOutputSource(
                averageMemory.OutputReference, averageMemory.OutputType, context);
            if (!outputSuccess)
            {
                await context.DisposeAsync();
                return (false, null, outputError);
            }

            // Validate output is not in inputs
            var (notInInputsSuccess, notInInputsError) = AverageMemoryValidator.ValidateOutputNotInInputs(
                inputSources, averageMemory.OutputReference);
            if (!notInInputsSuccess)
            {
                await context.DisposeAsync();
                return (false, null, notInInputsError);
            }

            // Validate weights
            var (weightsSuccess, weightsError) = AverageMemoryValidator.ValidateWeights(
                averageMemory.Weights, inputSources.Count);
            if (!weightsSuccess)
            {
                await context.DisposeAsync();
                return (false, null, weightsError);
            }

            // Validate interval
            if (averageMemory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, null, "Interval must be greater than 0");
            }

            // Validate stale timeout
            if (averageMemory.StaleTimeout <= 0)
            {
                await context.DisposeAsync();
                return (false, null, "StaleTimeout must be greater than 0");
            }

            // Validate outlier threshold
            if (averageMemory.OutlierThreshold <= 0)
            {
                await context.DisposeAsync();
                return (false, null, "OutlierThreshold must be greater than 0");
            }

            // Validate minimum inputs
            if (averageMemory.MinimumInputs < 1)
            {
                await context.DisposeAsync();
                return (false, null, "MinimumInputs must be at least 1");
            }

            if (averageMemory.MinimumInputs > inputSources.Count)
            {
                await context.DisposeAsync();
                return (false, null, $"MinimumInputs ({averageMemory.MinimumInputs}) cannot exceed number of input sources ({inputSources.Count})");
            }

            // Validate moving average parameters
            if (averageMemory.WindowSize < 2 || averageMemory.WindowSize > 1000)
            {
                await context.DisposeAsync();
                return (false, null, "WindowSize must be between 2 and 1000");
            }

            if (averageMemory.Alpha < 0.01 || averageMemory.Alpha > 1.0)
            {
                await context.DisposeAsync();
                return (false, null, "Alpha must be between 0.01 and 1.0");
            }

            context.AverageMemories.Add(averageMemory);
            await context.SaveChangesAsync();
            var id = averageMemory.Id;
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
    /// Edit an existing average memory configuration
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> EditAverageMemory(AverageMemory averageMemory)
    {
        try
        {
            var context = new DataContext();

            // Validate average memory exists
            var existing = await context.AverageMemories.AsNoTracking().FirstOrDefaultAsync(a => a.Id == averageMemory.Id);
            if (existing == null)
            {
                await context.DisposeAsync();
                return (false, "Average memory not found");
            }

            // Validate input sources (mixed Points and Global Variables)
            var (inputSuccess, inputError, inputSources) = await AverageMemoryValidator.ValidateInputSources(
                averageMemory.InputItemIds, context);
            if (!inputSuccess)
            {
                await context.DisposeAsync();
                return (false, inputError);
            }

            // Validate output source
            var (outputSuccess, outputError) = await AverageMemoryValidator.ValidateOutputSource(
                averageMemory.OutputReference, averageMemory.OutputType, context);
            if (!outputSuccess)
            {
                await context.DisposeAsync();
                return (false, outputError);
            }

            // Validate output is not in inputs
            var (notInInputsSuccess, notInInputsError) = AverageMemoryValidator.ValidateOutputNotInInputs(
                inputSources, averageMemory.OutputReference);
            if (!notInInputsSuccess)
            {
                await context.DisposeAsync();
                return (false, notInInputsError);
            }

            // Validate weights
            var (weightsSuccess, weightsError) = AverageMemoryValidator.ValidateWeights(
                averageMemory.Weights, inputSources.Count);
            if (!weightsSuccess)
            {
                await context.DisposeAsync();
                return (false, weightsError);
            }

            // Validate interval
            if (averageMemory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, "Interval must be greater than 0");
            }

            // Validate stale timeout
            if (averageMemory.StaleTimeout <= 0)
            {
                await context.DisposeAsync();
                return (false, "StaleTimeout must be greater than 0");
            }

            // Validate outlier threshold
            if (averageMemory.OutlierThreshold <= 0)
            {
                await context.DisposeAsync();
                return (false, "OutlierThreshold must be greater than 0");
            }

            // Validate minimum inputs
            if (averageMemory.MinimumInputs < 1)
            {
                await context.DisposeAsync();
                return (false, "MinimumInputs must be at least 1");
            }

            if (averageMemory.MinimumInputs > inputSources.Count)
            {
                await context.DisposeAsync();
                return (false, $"MinimumInputs ({averageMemory.MinimumInputs}) cannot exceed number of input sources ({inputSources.Count})");
            }

            // Validate moving average parameters
            if (averageMemory.WindowSize < 2 || averageMemory.WindowSize > 1000)
            {
                await context.DisposeAsync();
                return (false, "WindowSize must be between 2 and 1000");
            }

            if (averageMemory.Alpha < 0.01 || averageMemory.Alpha > 1.0)
            {
                await context.DisposeAsync();
                return (false, "Alpha must be between 0.01 and 1.0");
            }

            context.AverageMemories.Update(averageMemory);
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
    /// Delete an average memory configuration
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> DeleteAverageMemory(Guid id)
    {
        try
        {
            var context = new DataContext();
            var averageMemory = await context.AverageMemories.FindAsync(id);
            
            if (averageMemory == null)
            {
                await context.DisposeAsync();
                return (false, "Average memory not found");
            }

            context.AverageMemories.Remove(averageMemory);
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
