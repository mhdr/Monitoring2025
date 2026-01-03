using Core.Helpers;
using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Core;

/// <summary>
/// Validation helper for Average Memory mixed-source configurations
/// </summary>
public static class AverageMemoryValidator
{
    /// <summary>
    /// Validates input sources (Points and Global Variables)
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage, List<string> ParsedSources)> ValidateInputSources(
        string inputItemIds,
        DataContext context)
    {
        // Parse JSON array
        List<string>? sources;
        try
        {
            sources = JsonSerializer.Deserialize<List<string>>(inputItemIds);
            if (sources == null || sources.Count == 0)
            {
                return (false, "InputItemIds must contain at least one item", new List<string>());
            }
        }
        catch (Exception ex)
        {
            return (false, $"Invalid InputItemIds JSON format: {ex.Message}", new List<string>());
        }

        // Validate each source
        foreach (var source in sources)
        {
            var (type, reference) = SourceReferenceParser.Parse(source);
            
            if (type == TimeoutSourceType.Point)
            {
                // Validate Point exists and is analog type
                if (!Guid.TryParse(reference, out var itemId))
                {
                    return (false, $"Invalid Point GUID: {reference}", new List<string>());
                }

                var item = await context.MonitoringItems.FindAsync(itemId);
                if (item == null)
                {
                    return (false, $"Point not found: {reference}", new List<string>());
                }

                if (item.ItemType != ItemType.AnalogInput && item.ItemType != ItemType.AnalogOutput)
                {
                    return (false, $"Point must be AnalogInput or AnalogOutput: {reference}", new List<string>());
                }
            }
            else // GlobalVariable
            {
                // Validate Global Variable exists and is enabled
                var gv = await context.GlobalVariables.FirstOrDefaultAsync(v => v.Name == reference);
                if (gv == null)
                {
                    return (false, $"Global Variable not found: {reference}", new List<string>());
                }

                if (gv.IsDisabled)
                {
                    return (false, $"Global Variable is disabled: {reference}", new List<string>());
                }

                // Both Boolean and Float types are acceptable for inputs (Boolean converts to 0/1)
            }
        }

        return (true, null, sources);
    }

    /// <summary>
    /// Validates output source (Point or Global Variable)
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> ValidateOutputSource(
        string outputReference,
        TimeoutSourceType outputType,
        DataContext context)
    {
        if (string.IsNullOrEmpty(outputReference))
        {
            return (false, "Output reference is required");
        }

        // Parse the output reference using the prefix format (P:guid or GV:name)
        var (parsedType, reference) = SourceReferenceParser.Parse(outputReference);
        
        // Validate that parsed type matches the provided outputType
        if (parsedType != outputType)
        {
            return (false, $"Output reference format mismatch: expected {outputType} but got {parsedType}");
        }

        if (parsedType == TimeoutSourceType.Point)
        {
            // Validate Point exists and is analog type
            if (!Guid.TryParse(reference, out var itemId))
            {
                return (false, "Invalid output Point GUID");
            }

            var item = await context.MonitoringItems.FindAsync(itemId);
            if (item == null)
            {
                return (false, "Output Point not found");
            }

            if (item.ItemType != ItemType.AnalogInput && item.ItemType != ItemType.AnalogOutput)
            {
                return (false, "Output Point must be AnalogInput or AnalogOutput");
            }
        }
        else // GlobalVariable
        {
            // Validate Global Variable exists, is enabled, and is Float type
            var gv = await context.GlobalVariables.FirstOrDefaultAsync(v => v.Name == reference);
            if (gv == null)
            {
                return (false, "Output Global Variable not found");
            }

            if (gv.VariableType != GlobalVariableType.Float)
            {
                return (false, "Output Global Variable must be Float type (Boolean not allowed for output)");
            }

            if (gv.IsDisabled)
            {
                return (false, "Output Global Variable is disabled");
            }
        }

        return (true, null);
    }

    /// <summary>
    /// Validates that output is not in the input sources list
    /// </summary>
    public static (bool Success, string? ErrorMessage) ValidateOutputNotInInputs(
        List<string> inputSources,
        string outputReference)
    {
        if (inputSources.Contains(outputReference))
        {
            return (false, "Output cannot be in the input sources list");
        }

        return (true, null);
    }

    /// <summary>
    /// Validates weights array matches input count
    /// </summary>
    public static (bool Success, string? ErrorMessage) ValidateWeights(
        string? weights,
        int inputCount)
    {
        if (string.IsNullOrWhiteSpace(weights))
        {
            return (true, null); // Weights are optional
        }

        try
        {
            var weightsList = JsonSerializer.Deserialize<List<double>>(weights);
            if (weightsList == null)
            {
                return (false, "Weights JSON is invalid");
            }

            if (weightsList.Count != inputCount)
            {
                return (false, $"Weights array length ({weightsList.Count}) must match input sources count ({inputCount})");
            }

            if (weightsList.Any(w => w <= 0))
            {
                return (false, "All weights must be positive numbers");
            }
        }
        catch (Exception ex)
        {
            return (false, $"Invalid Weights JSON format: {ex.Message}");
        }

        return (true, null);
    }
}
