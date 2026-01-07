using System.Linq.Expressions;
using System.Text.Json;
using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;
using NCalc;

namespace Core;

/// <summary>
/// Helper class for IfMemory CRUD operations
/// </summary>
public class IfMemories
{
    /// <summary>
    /// Maximum number of branches allowed per IF memory
    /// </summary>
    public const int MaxBranches = 20;

    /// <summary>
    /// Get all IF memory configurations
    /// </summary>
    public static async Task<List<IfMemory>?> GetIfMemories()
    {
        var context = new DataContext();
        var found = await context.IfMemories.ToListAsync();
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Get a specific IF memory by predicate
    /// </summary>
    public static async Task<IfMemory?> GetIfMemory(Expression<Func<IfMemory, bool>> predicate)
    {
        var context = new DataContext();
        var found = await context.IfMemories.FirstOrDefaultAsync(predicate);
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Add a new IF memory configuration
    /// </summary>
    public static async Task<(bool Success, Guid? Id, string? ErrorMessage)> AddIfMemory(IfMemory ifMemory)
    {
        try
        {
            var context = new DataContext();

            // Parse and validate branches
            List<ConditionalBranch>? branches;
            try
            {
                branches = JsonSerializer.Deserialize<List<ConditionalBranch>>(ifMemory.Branches);
                if (branches == null)
                {
                    await context.DisposeAsync();
                    return (false, null, "Branches must be a valid JSON array");
                }
            }
            catch (JsonException ex)
            {
                await context.DisposeAsync();
                return (false, null, $"Invalid branches JSON format: {ex.Message}");
            }

            // Validate branch count
            if (branches.Count > MaxBranches)
            {
                await context.DisposeAsync();
                return (false, null, $"Maximum {MaxBranches} branches allowed");
            }

            // Parse and validate variable aliases
            Dictionary<string, string>? aliases;
            try
            {
                aliases = JsonSerializer.Deserialize<Dictionary<string, string>>(ifMemory.VariableAliases ?? "{}");
                if (aliases == null)
                {
                    await context.DisposeAsync();
                    return (false, null, "Variable aliases must be a valid JSON object");
                }
            }
            catch (JsonException ex)
            {
                await context.DisposeAsync();
                return (false, null, $"Invalid variable aliases JSON format: {ex.Message}");
            }

            // Validate each branch
            for (int i = 0; i < branches.Count; i++)
            {
                var branch = branches[i];

                // Validate condition is not empty
                if (string.IsNullOrWhiteSpace(branch.Condition))
                {
                    await context.DisposeAsync();
                    return (false, null, $"Branch {i + 1}: Condition is required");
                }

                // Validate condition syntax
                var conditionValidation = ValidateCondition(branch.Condition, ifMemory.VariableAliases ?? "{}");
                if (!conditionValidation.IsValid)
                {
                    await context.DisposeAsync();
                    return (false, null, $"Branch {i + 1}: {conditionValidation.ErrorMessage}");
                }

                // Validate hysteresis is non-negative
                if (branch.Hysteresis < 0)
                {
                    await context.DisposeAsync();
                    return (false, null, $"Branch {i + 1}: Hysteresis must be non-negative");
                }
            }

            // Validate output destination (Point or Global Variable)
            if (ifMemory.OutputDestinationType == TimeoutSourceType.Point)
            {
                // Validate Point output
                if (string.IsNullOrEmpty(ifMemory.OutputReference))
                {
                    // Backward compatibility: check OutputItemId
                    if (!ifMemory.OutputItemId.HasValue)
                    {
                        await context.DisposeAsync();
                        return (false, null, "Output reference is required");
                    }
                    // Use OutputItemId for validation
                    var outputItem = await context.MonitoringItems.FindAsync(ifMemory.OutputItemId.Value);
                    if (outputItem == null)
                    {
                        await context.DisposeAsync();
                        return (false, null, "Output item not found");
                    }
                    // Validate OutputItem type matches OutputType
                    if (ifMemory.OutputType == IfMemoryOutputType.Digital)
                    {
                        if (outputItem.ItemType != ItemType.DigitalOutput)
                        {
                            await context.DisposeAsync();
                            return (false, null, "Output item must be DigitalOutput for Digital output type");
                        }
                    }
                    else // Analog
                    {
                        if (outputItem.ItemType != ItemType.AnalogOutput)
                        {
                            await context.DisposeAsync();
                            return (false, null, "Output item must be AnalogOutput for Analog output type");
                        }
                    }
                }
                else
                {
                    // Validate OutputReference as GUID
                    if (!Guid.TryParse(ifMemory.OutputReference, out var outputGuid))
                    {
                        await context.DisposeAsync();
                        return (false, null, "Output reference must be a valid GUID for Point output");
                    }
                    var outputItem = await context.MonitoringItems.FindAsync(outputGuid);
                    if (outputItem == null)
                    {
                        await context.DisposeAsync();
                        return (false, null, "Output item not found");
                    }
                    // Validate OutputItem type matches OutputType
                    if (ifMemory.OutputType == IfMemoryOutputType.Digital)
                    {
                        if (outputItem.ItemType != ItemType.DigitalOutput)
                        {
                            await context.DisposeAsync();
                            return (false, null, "Output item must be DigitalOutput for Digital output type");
                        }
                    }
                    else // Analog
                    {
                        if (outputItem.ItemType != ItemType.AnalogOutput)
                        {
                            await context.DisposeAsync();
                            return (false, null, "Output item must be AnalogOutput for Analog output type");
                        }
                    }
                }
            }
            else if (ifMemory.OutputDestinationType == TimeoutSourceType.GlobalVariable)
            {
                // Validate Global Variable output
                if (string.IsNullOrEmpty(ifMemory.OutputReference))
                {
                    await context.DisposeAsync();
                    return (false, null, "Output reference (Global Variable name) is required");
                }
                
                var globalVariable = await GlobalVariables.GetGlobalVariableByName(ifMemory.OutputReference);
                if (globalVariable == null)
                {
                    await context.DisposeAsync();
                    return (false, null, $"Global Variable '{ifMemory.OutputReference}' not found");
                }
                
                if (globalVariable.IsDisabled)
                {
                    await context.DisposeAsync();
                    return (false, null, $"Global Variable '{ifMemory.OutputReference}' is disabled");
                }
                
                // Global Variable type validation based on OutputType
                if (ifMemory.OutputType == IfMemoryOutputType.Digital)
                {
                    // Digital output can use Boolean or Float type
                    if (globalVariable.VariableType != GlobalVariableType.Boolean && 
                        globalVariable.VariableType != GlobalVariableType.Float)
                    {
                        await context.DisposeAsync();
                        return (false, null, $"Output Global Variable must be Boolean or Float type for Digital output");
                    }
                }
                else // Analog
                {
                    // Analog output must use Float type
                    if (globalVariable.VariableType != GlobalVariableType.Float)
                    {
                        await context.DisposeAsync();
                        return (false, null, $"Output Global Variable must be Float type for Analog output, but '{ifMemory.OutputReference}' is Boolean");
                    }
                }
            }

            // Validate each input item exists (legacy validation with OutputItemId)
            Guid? legacyOutputItemId = null;
            if (ifMemory.OutputDestinationType == TimeoutSourceType.Point)
            {
                if (!string.IsNullOrEmpty(ifMemory.OutputReference))
                {
                    Guid.TryParse(ifMemory.OutputReference, out var outputGuid);
                    legacyOutputItemId = outputGuid;
                }
                else if (ifMemory.OutputItemId.HasValue)
                {
                    legacyOutputItemId = ifMemory.OutputItemId.Value;
                }
            }

            // Validate each input item exists
            foreach (var (alias, itemIdStr) in aliases)
            {
                if (!Guid.TryParse(itemIdStr, out var itemId))
                {
                    await context.DisposeAsync();
                    return (false, null, $"Invalid item ID format for variable '{alias}'");
                }

                var inputItem = await context.MonitoringItems.FindAsync(itemId);
                if (inputItem == null)
                {
                    await context.DisposeAsync();
                    return (false, null, $"Input item not found for variable '{alias}'");
                }

                // Validate input is not the same as output (for Point output)
                if (legacyOutputItemId.HasValue && itemId == legacyOutputItemId.Value)
                {
                    await context.DisposeAsync();
                    return (false, null, $"Input item for variable '{alias}' cannot be the same as output item");
                }
            }

            // Validate interval
            if (ifMemory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, null, "Interval must be greater than 0");
            }

            context.IfMemories.Add(ifMemory);
            await context.SaveChangesAsync();

            // Invalidate usage cache for referenced global variables
            await GlobalVariableUsageCache.OnMemoryChanged(ifMemory.Id, "IfMemory");

            await context.DisposeAsync();
            return (true, ifMemory.Id, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to add IF memory", ex, new Dictionary<string, object?>
            {
                ["IfMemory"] = ifMemory
            });
            return (false, null, $"Exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Edit an existing IF memory configuration
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> EditIfMemory(IfMemory ifMemory)
    {
        try
        {
            var context = new DataContext();

            // Check if exists
            var existing = await context.IfMemories.FindAsync(ifMemory.Id);
            if (existing == null)
            {
                await context.DisposeAsync();
                return (false, "IF memory not found");
            }

            // Parse and validate branches
            List<ConditionalBranch>? branches;
            try
            {
                branches = JsonSerializer.Deserialize<List<ConditionalBranch>>(ifMemory.Branches);
                if (branches == null)
                {
                    await context.DisposeAsync();
                    return (false, "Branches must be a valid JSON array");
                }
            }
            catch (JsonException ex)
            {
                await context.DisposeAsync();
                return (false, $"Invalid branches JSON format: {ex.Message}");
            }

            // Validate branch count
            if (branches.Count > MaxBranches)
            {
                await context.DisposeAsync();
                return (false, $"Maximum {MaxBranches} branches allowed");
            }

            // Parse and validate variable aliases
            Dictionary<string, string>? aliases;
            try
            {
                aliases = JsonSerializer.Deserialize<Dictionary<string, string>>(ifMemory.VariableAliases ?? "{}");
                if (aliases == null)
                {
                    await context.DisposeAsync();
                    return (false, "Variable aliases must be a valid JSON object");
                }
            }
            catch (JsonException ex)
            {
                await context.DisposeAsync();
                return (false, $"Invalid variable aliases JSON format: {ex.Message}");
            }

            // Validate each branch
            for (int i = 0; i < branches.Count; i++)
            {
                var branch = branches[i];

                // Validate condition is not empty
                if (string.IsNullOrWhiteSpace(branch.Condition))
                {
                    await context.DisposeAsync();
                    return (false, $"Branch {i + 1}: Condition is required");
                }

                // Validate condition syntax
                var conditionValidation = ValidateCondition(branch.Condition, ifMemory.VariableAliases ?? "{}");
                if (!conditionValidation.IsValid)
                {
                    await context.DisposeAsync();
                    return (false, $"Branch {i + 1}: {conditionValidation.ErrorMessage}");
                }

                // Validate hysteresis is non-negative
                if (branch.Hysteresis < 0)
                {
                    await context.DisposeAsync();
                    return (false, $"Branch {i + 1}: Hysteresis must be non-negative");
                }
            }

            // Validate output destination (Point or Global Variable)
            if (ifMemory.OutputDestinationType == TimeoutSourceType.Point)
            {
                // Validate Point output
                if (string.IsNullOrEmpty(ifMemory.OutputReference))
                {
                    // Backward compatibility: check OutputItemId
                    if (!ifMemory.OutputItemId.HasValue)
                    {
                        await context.DisposeAsync();
                        return (false, "Output reference is required");
                    }
                    // Use OutputItemId for validation
                    var outputItem = await context.MonitoringItems.FindAsync(ifMemory.OutputItemId.Value);
                    if (outputItem == null)
                    {
                        await context.DisposeAsync();
                        return (false, "Output item not found");
                    }
                    // Validate OutputItem type matches OutputType
                    if (ifMemory.OutputType == IfMemoryOutputType.Digital)
                    {
                        if (outputItem.ItemType != ItemType.DigitalOutput)
                        {
                            await context.DisposeAsync();
                            return (false, "Output item must be DigitalOutput for Digital output type");
                        }
                    }
                    else // Analog
                    {
                        if (outputItem.ItemType != ItemType.AnalogOutput)
                        {
                            await context.DisposeAsync();
                            return (false, "Output item must be AnalogOutput for Analog output type");
                        }
                    }
                }
                else
                {
                    // Validate OutputReference as GUID
                    if (!Guid.TryParse(ifMemory.OutputReference, out var outputGuid))
                    {
                        await context.DisposeAsync();
                        return (false, "Output reference must be a valid GUID for Point output");
                    }
                    var outputItem = await context.MonitoringItems.FindAsync(outputGuid);
                    if (outputItem == null)
                    {
                        await context.DisposeAsync();
                        return (false, "Output item not found");
                    }
                    // Validate OutputItem type matches OutputType
                    if (ifMemory.OutputType == IfMemoryOutputType.Digital)
                    {
                        if (outputItem.ItemType != ItemType.DigitalOutput)
                        {
                            await context.DisposeAsync();
                            return (false, "Output item must be DigitalOutput for Digital output type");
                        }
                    }
                    else // Analog
                    {
                        if (outputItem.ItemType != ItemType.AnalogOutput)
                        {
                            await context.DisposeAsync();
                            return (false, "Output item must be AnalogOutput for Analog output type");
                        }
                    }
                }
            }
            else if (ifMemory.OutputDestinationType == TimeoutSourceType.GlobalVariable)
            {
                // Validate Global Variable output
                if (string.IsNullOrEmpty(ifMemory.OutputReference))
                {
                    await context.DisposeAsync();
                    return (false, "Output reference (Global Variable name) is required");
                }
                
                var globalVariable = await GlobalVariables.GetGlobalVariableByName(ifMemory.OutputReference);
                if (globalVariable == null)
                {
                    await context.DisposeAsync();
                    return (false, $"Global Variable '{ifMemory.OutputReference}' not found");
                }
                
                if (globalVariable.IsDisabled)
                {
                    await context.DisposeAsync();
                    return (false, $"Global Variable '{ifMemory.OutputReference}' is disabled");
                }
                
                // Global Variable type validation based on OutputType
                if (ifMemory.OutputType == IfMemoryOutputType.Digital)
                {
                    // Digital output can use Boolean or Float type
                    if (globalVariable.VariableType != GlobalVariableType.Boolean && 
                        globalVariable.VariableType != GlobalVariableType.Float)
                    {
                        await context.DisposeAsync();
                        return (false, $"Output Global Variable must be Boolean or Float type for Digital output");
                    }
                }
                else // Analog
                {
                    // Analog output must use Float type
                    if (globalVariable.VariableType != GlobalVariableType.Float)
                    {
                        await context.DisposeAsync();
                        return (false, $"Output Global Variable must be Float type for Analog output, but '{ifMemory.OutputReference}' is Boolean");
                    }
                }
            }

            // Validate each input item exists (legacy validation with OutputItemId)
            Guid? legacyOutputItemId = null;
            if (ifMemory.OutputDestinationType == TimeoutSourceType.Point)
            {
                if (!string.IsNullOrEmpty(ifMemory.OutputReference))
                {
                    Guid.TryParse(ifMemory.OutputReference, out var outputGuid);
                    legacyOutputItemId = outputGuid;
                }
                else if (ifMemory.OutputItemId.HasValue)
                {
                    legacyOutputItemId = ifMemory.OutputItemId.Value;
                }
            }

            // Validate each input item exists
            foreach (var (alias, itemIdStr) in aliases)
            {
                if (!Guid.TryParse(itemIdStr, out var itemId))
                {
                    await context.DisposeAsync();
                    return (false, $"Invalid item ID format for variable '{alias}'");
                }

                var inputItem = await context.MonitoringItems.FindAsync(itemId);
                if (inputItem == null)
                {
                    await context.DisposeAsync();
                    return (false, $"Input item not found for variable '{alias}'");
                }

                // Validate input is not the same as output (for Point output)
                if (legacyOutputItemId.HasValue && itemId == legacyOutputItemId.Value)
                {
                    await context.DisposeAsync();
                    return (false, $"Input item for variable '{alias}' cannot be the same as output item");
                }
            }

            // Validate interval
            if (ifMemory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, "Interval must be greater than 0");
            }

            // Update all fields
            existing.Name = ifMemory.Name;
            existing.Branches = ifMemory.Branches;
            existing.DefaultValue = ifMemory.DefaultValue;
            existing.VariableAliases = ifMemory.VariableAliases ?? "{}";
            existing.OutputDestinationType = ifMemory.OutputDestinationType;
            existing.OutputReference = ifMemory.OutputReference;
            existing.OutputItemId = ifMemory.OutputItemId;
            existing.OutputType = ifMemory.OutputType;
            existing.Interval = ifMemory.Interval;
            existing.IsDisabled = ifMemory.IsDisabled;
            existing.Description = ifMemory.Description;

            context.IfMemories.Update(existing);
            await context.SaveChangesAsync();

            // Notify IfMemoryProcess to invalidate cache
            IfMemoryProcess.Instance.InvalidateCache(ifMemory.Id);

            // Invalidate usage cache for referenced global variables
            await GlobalVariableUsageCache.OnMemoryChanged(ifMemory.Id, "IfMemory");

            await context.DisposeAsync();
            return (true, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to edit IF memory", ex, new Dictionary<string, object?>
            {
                ["IfMemory"] = ifMemory
            });
            return (false, $"Exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Delete an IF memory configuration
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> DeleteIfMemory(Guid id)
    {
        try
        {
            var context = new DataContext();

            var existing = await context.IfMemories.FindAsync(id);
            if (existing == null)
            {
                await context.DisposeAsync();
                return (false, "IF memory not found");
            }

            // Invalidate usage cache for referenced global variables (before deletion)
            await GlobalVariableUsageCache.OnMemoryChanged(id, "IfMemory");

            context.IfMemories.Remove(existing);
            await context.SaveChangesAsync();

            // Notify IfMemoryProcess to remove from cache
            IfMemoryProcess.Instance.InvalidateCache(id);

            await context.DisposeAsync();
            return (true, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to delete IF memory", ex, new Dictionary<string, object?>
            {
                ["Id"] = id
            });
            return (false, $"Exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Validate an NCalc condition expression syntax and check that all variables are defined.
    /// The condition should evaluate to a boolean (true/false).
    /// </summary>
    public static (bool IsValid, string? ErrorMessage) ValidateCondition(string condition, string variableAliasesJson)
    {
        if (string.IsNullOrWhiteSpace(condition))
        {
            return (false, "Condition is required");
        }

        if (condition.Length > 2000)
        {
            return (false, "Condition must not exceed 2000 characters");
        }

        // Parse variable aliases
        Dictionary<string, string>? aliases;
        try
        {
            aliases = JsonSerializer.Deserialize<Dictionary<string, string>>(variableAliasesJson ?? "{}");
            if (aliases == null) aliases = new Dictionary<string, string>();
        }
        catch (JsonException)
        {
            return (false, "Invalid variable aliases JSON format");
        }

        try
        {
            // Create expression and register custom functions for validation
            var expr = new NCalc.Expression(condition);

            // Register custom functions so they don't cause parse errors
            FormulaFunctions.RegisterCustomFunctions(expr);

            // Set all variables to a sample value for validation
            foreach (var alias in aliases.Keys)
            {
                expr.Parameters[alias] = 50.0; // Use a non-zero value for testing comparisons
            }

            // Try to evaluate to catch syntax errors
            if (expr.HasErrors())
            {
                return (false, $"Condition syntax error: {expr.Error}");
            }

            // Attempt evaluation to catch runtime errors
            try
            {
                var result = expr.Evaluate();

                // Verify result is boolean-like
                if (result is bool)
                {
                    return (true, null);
                }
                else if (result is double || result is int || result is float || result is decimal)
                {
                    // Numeric result is acceptable (non-zero = true, zero = false)
                    return (true, null);
                }
                else
                {
                    return (false, $"Condition must evaluate to a boolean or numeric value, got: {result?.GetType().Name ?? "null"}");
                }
            }
            catch (ArgumentException ex)
            {
                // This often indicates an undefined variable
                return (false, $"Condition error: {ex.Message}");
            }
            catch (Exception ex)
            {
                return (false, $"Condition evaluation error: {ex.Message}");
            }
        }
        catch (Exception ex)
        {
            return (false, $"Condition parse error: {ex.Message}");
        }
    }

    /// <summary>
    /// Test evaluate a condition with provided variable values (for live preview).
    /// Returns whether the condition evaluates to true or false.
    /// </summary>
    public static (bool Success, bool? Result, string? ErrorMessage) TestCondition(
        string condition,
        Dictionary<string, double> variableValues)
    {
        if (string.IsNullOrWhiteSpace(condition))
        {
            return (false, null, "Condition is required");
        }

        try
        {
            var expr = new NCalc.Expression(condition);

            // Register custom functions
            FormulaFunctions.RegisterCustomFunctions(expr);

            // Set variable values
            foreach (var (alias, value) in variableValues)
            {
                expr.Parameters[alias] = value;
            }

            // Check for syntax errors
            if (expr.HasErrors())
            {
                return (false, null, $"Condition syntax error: {expr.Error}");
            }

            // Evaluate
            var result = expr.Evaluate();

            if (result is bool b)
            {
                return (true, b, null);
            }
            else if (result is double d)
            {
                return (true, Math.Abs(d) > 1e-10, null);
            }
            else if (result is int i)
            {
                return (true, i != 0, null);
            }
            else if (result is float f)
            {
                return (true, Math.Abs(f) > 1e-10, null);
            }
            else if (result is decimal dec)
            {
                return (true, dec != 0, null);
            }
            else
            {
                return (false, null, $"Condition result is not a boolean or numeric: {result}");
            }
        }
        catch (Exception ex)
        {
            return (false, null, $"Condition evaluation error: {ex.Message}");
        }
    }
}
