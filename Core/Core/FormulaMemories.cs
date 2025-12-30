using System.Linq.Expressions;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;
using NCalc;
using NCalc.Handlers;

namespace Core;

/// <summary>
/// Helper class for FormulaMemory CRUD operations
/// </summary>
public class FormulaMemories
{
    /// <summary>
    /// Get all formula memory configurations
    /// </summary>
    public static async Task<List<FormulaMemory>?> GetFormulaMemories()
    {
        var context = new DataContext();
        var found = await context.FormulaMemories.ToListAsync();
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Get a specific formula memory by predicate
    /// </summary>
    public static async Task<FormulaMemory?> GetFormulaMemory(Expression<Func<FormulaMemory, bool>> predicate)
    {
        var context = new DataContext();
        var found = await context.FormulaMemories.FirstOrDefaultAsync(predicate);
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Add a new formula memory configuration
    /// </summary>
    public static async Task<(bool Success, Guid? Id, string? ErrorMessage)> AddFormulaMemory(FormulaMemory formulaMemory)
    {
        try
        {
            var context = new DataContext();

            // Validate expression syntax
            var validationResult = ValidateExpression(formulaMemory.Expression, formulaMemory.VariableAliases);
            if (!validationResult.IsValid)
            {
                await context.DisposeAsync();
                return (false, null, validationResult.ErrorMessage);
            }

            // Validate OutputItem exists
            var outputItem = await context.MonitoringItems.FindAsync(formulaMemory.OutputItemId);
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

            // Parse and validate variable aliases
            Dictionary<string, string>? aliases;
            try
            {
                aliases = JsonSerializer.Deserialize<Dictionary<string, string>>(formulaMemory.VariableAliases);
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

            // Validate each input item exists and is analog type
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

                if (inputItem.ItemType != ItemType.AnalogInput && inputItem.ItemType != ItemType.AnalogOutput)
                {
                    await context.DisposeAsync();
                    return (false, null, $"Input item for variable '{alias}' must be AnalogInput or AnalogOutput");
                }

                // Validate input is not the same as output
                if (itemId == formulaMemory.OutputItemId)
                {
                    await context.DisposeAsync();
                    return (false, null, $"Input item for variable '{alias}' cannot be the same as output item");
                }
            }

            // Validate interval
            if (formulaMemory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, null, "Interval must be greater than 0");
            }

            // Validate decimal places
            if (formulaMemory.DecimalPlaces < 0 || formulaMemory.DecimalPlaces > 10)
            {
                await context.DisposeAsync();
                return (false, null, "Decimal places must be between 0 and 10");
            }

            // Compute expression hash for cache invalidation
            formulaMemory.ExpressionHash = ComputeExpressionHash(formulaMemory.Expression);

            context.FormulaMemories.Add(formulaMemory);
            await context.SaveChangesAsync();

            await context.DisposeAsync();
            return (true, formulaMemory.Id, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to add formula memory", ex, new Dictionary<string, object?>
            {
                ["FormulaMemory"] = formulaMemory
            });
            return (false, null, $"Exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Edit an existing formula memory configuration
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> EditFormulaMemory(FormulaMemory formulaMemory)
    {
        try
        {
            var context = new DataContext();

            // Check if exists
            var existing = await context.FormulaMemories.FindAsync(formulaMemory.Id);
            if (existing == null)
            {
                await context.DisposeAsync();
                return (false, "Formula memory not found");
            }

            // Validate expression syntax
            var validationResult = ValidateExpression(formulaMemory.Expression, formulaMemory.VariableAliases);
            if (!validationResult.IsValid)
            {
                await context.DisposeAsync();
                return (false, validationResult.ErrorMessage);
            }

            // Validate OutputItem exists
            var outputItem = await context.MonitoringItems.FindAsync(formulaMemory.OutputItemId);
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

            // Parse and validate variable aliases
            Dictionary<string, string>? aliases;
            try
            {
                aliases = JsonSerializer.Deserialize<Dictionary<string, string>>(formulaMemory.VariableAliases);
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

            // Validate each input item exists and is analog type
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

                if (inputItem.ItemType != ItemType.AnalogInput && inputItem.ItemType != ItemType.AnalogOutput)
                {
                    await context.DisposeAsync();
                    return (false, $"Input item for variable '{alias}' must be AnalogInput or AnalogOutput");
                }

                // Validate input is not the same as output
                if (itemId == formulaMemory.OutputItemId)
                {
                    await context.DisposeAsync();
                    return (false, $"Input item for variable '{alias}' cannot be the same as output item");
                }
            }

            // Validate interval
            if (formulaMemory.Interval <= 0)
            {
                await context.DisposeAsync();
                return (false, "Interval must be greater than 0");
            }

            // Validate decimal places
            if (formulaMemory.DecimalPlaces < 0 || formulaMemory.DecimalPlaces > 10)
            {
                await context.DisposeAsync();
                return (false, "Decimal places must be between 0 and 10");
            }

            // Update all fields
            existing.Name = formulaMemory.Name;
            existing.Expression = formulaMemory.Expression;
            existing.VariableAliases = formulaMemory.VariableAliases;
            existing.OutputItemId = formulaMemory.OutputItemId;
            existing.Interval = formulaMemory.Interval;
            existing.IsDisabled = formulaMemory.IsDisabled;
            existing.DecimalPlaces = formulaMemory.DecimalPlaces;
            existing.Units = formulaMemory.Units;
            existing.Description = formulaMemory.Description;

            // Recompute expression hash if expression changed
            var newHash = ComputeExpressionHash(formulaMemory.Expression);
            if (existing.ExpressionHash != newHash)
            {
                existing.ExpressionHash = newHash;
                // Clear last error when expression changes
                existing.LastError = null;
            }

            context.FormulaMemories.Update(existing);
            await context.SaveChangesAsync();

            // Notify FormulaMemoryProcess to invalidate cache
            FormulaMemoryProcess.Instance.InvalidateCache(formulaMemory.Id);

            await context.DisposeAsync();
            return (true, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to edit formula memory", ex, new Dictionary<string, object?>
            {
                ["FormulaMemory"] = formulaMemory
            });
            return (false, $"Exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Delete a formula memory configuration
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> DeleteFormulaMemory(Guid id)
    {
        try
        {
            var context = new DataContext();

            var existing = await context.FormulaMemories.FindAsync(id);
            if (existing == null)
            {
                await context.DisposeAsync();
                return (false, "Formula memory not found");
            }

            context.FormulaMemories.Remove(existing);
            await context.SaveChangesAsync();

            // Notify FormulaMemoryProcess to remove from cache
            FormulaMemoryProcess.Instance.InvalidateCache(id);

            await context.DisposeAsync();
            return (true, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to delete formula memory", ex, new Dictionary<string, object?>
            {
                ["Id"] = id
            });
            return (false, $"Exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Validate an NCalc expression syntax and check that all variables are defined
    /// </summary>
    public static (bool IsValid, string? ErrorMessage) ValidateExpression(string expression, string variableAliasesJson)
    {
        if (string.IsNullOrWhiteSpace(expression))
        {
            return (false, "Expression is required");
        }

        if (expression.Length > 2000)
        {
            return (false, "Expression must not exceed 2000 characters");
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
            var expr = new NCalc.Expression(expression);

            // Register custom functions so they don't cause parse errors
            expr.EvaluateFunction += (name, args) =>
            {
                switch (name.ToLower())
                {
                    case "avg":
                    case "min":
                    case "max":
                        args.Result = 0.0;
                        break;
                    case "clamp":
                    case "iff":
                        args.Result = 0.0;
                        break;
                    case "scale":
                        args.Result = 0.0;
                        break;
                    case "deadband":
                        args.Result = 0.0;
                        break;
                }
            };

            // Set all variables to 0 for validation
            foreach (var alias in aliases.Keys)
            {
                expr.Parameters[alias] = 0.0;
            }

            // Try to evaluate to catch syntax errors
            if (expr.HasErrors())
            {
                return (false, $"Expression syntax error: {expr.Error}");
            }

            // Attempt evaluation to catch runtime errors
            try
            {
                var result = expr.Evaluate();
            }
            catch (ArgumentException ex)
            {
                // This often indicates an undefined variable
                return (false, $"Expression error: {ex.Message}");
            }
            catch (Exception ex)
            {
                return (false, $"Expression evaluation error: {ex.Message}");
            }

            return (true, null);
        }
        catch (Exception ex)
        {
            return (false, $"Expression parse error: {ex.Message}");
        }
    }

    /// <summary>
    /// Test evaluate an expression with provided variable values (for live preview)
    /// </summary>
    public static (bool Success, double? Result, string? ErrorMessage) TestExpression(
        string expression,
        Dictionary<string, double> variableValues)
    {
        if (string.IsNullOrWhiteSpace(expression))
        {
            return (false, null, "Expression is required");
        }

        try
        {
            var expr = new NCalc.Expression(expression);

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
                return (false, null, $"Expression syntax error: {expr.Error}");
            }

            // Evaluate
            var result = expr.Evaluate();

            if (result is double d)
            {
                return (true, d, null);
            }
            else if (result is int i)
            {
                return (true, (double)i, null);
            }
            else if (result is float f)
            {
                return (true, (double)f, null);
            }
            else if (result is decimal dec)
            {
                return (true, (double)dec, null);
            }
            else if (result is bool b)
            {
                return (true, b ? 1.0 : 0.0, null);
            }
            else
            {
                // Try to convert
                if (double.TryParse(result?.ToString(), out var parsed))
                {
                    return (true, parsed, null);
                }
                return (false, null, $"Expression result is not a number: {result}");
            }
        }
        catch (Exception ex)
        {
            return (false, null, $"Expression evaluation error: {ex.Message}");
        }
    }

    /// <summary>
    /// Compute SHA256 hash of expression string for cache invalidation
    /// </summary>
    public static string ComputeExpressionHash(string expression)
    {
        using var sha256 = SHA256.Create();
        var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(expression ?? ""));
        return Convert.ToBase64String(bytes);
    }
}

/// <summary>
/// Custom NCalc functions for engineering calculations
/// </summary>
public static class FormulaFunctions
{
    /// <summary>
    /// Register all custom functions with an NCalc expression
    /// </summary>
    public static void RegisterCustomFunctions(NCalc.Expression expression)
    {
        expression.EvaluateFunction += (name, args) =>
        {
            switch (name.ToLower())
            {
                case "avg":
                    HandleAvg(args);
                    break;
                case "min":
                    HandleMin(args);
                    break;
                case "max":
                    HandleMax(args);
                    break;
                case "clamp":
                    HandleClamp(args);
                    break;
                case "scale":
                    HandleScale(args);
                    break;
                case "deadband":
                    HandleDeadband(args);
                    break;
                case "iff":
                    HandleIff(args);
                    break;
            }
        };
    }

    /// <summary>
    /// avg(v1, v2, ...) - Average of all arguments
    /// </summary>
    private static void HandleAvg(FunctionArgs args)
    {
        if (args.Parameters.Length == 0)
        {
            args.Result = 0.0;
            return;
        }

        var sum = 0.0;
        foreach (var param in args.Parameters)
        {
            sum += Convert.ToDouble(param.Evaluate());
        }
        args.Result = sum / args.Parameters.Length;
    }

    /// <summary>
    /// min(v1, v2, ...) - Minimum of all arguments
    /// </summary>
    private static void HandleMin(FunctionArgs args)
    {
        if (args.Parameters.Length == 0)
        {
            args.Result = 0.0;
            return;
        }

        var min = double.MaxValue;
        foreach (var param in args.Parameters)
        {
            var value = Convert.ToDouble(param.Evaluate());
            if (value < min) min = value;
        }
        args.Result = min;
    }

    /// <summary>
    /// max(v1, v2, ...) - Maximum of all arguments
    /// </summary>
    private static void HandleMax(FunctionArgs args)
    {
        if (args.Parameters.Length == 0)
        {
            args.Result = 0.0;
            return;
        }

        var max = double.MinValue;
        foreach (var param in args.Parameters)
        {
            var value = Convert.ToDouble(param.Evaluate());
            if (value > max) max = value;
        }
        args.Result = max;
    }

    /// <summary>
    /// clamp(value, min, max) - Constrain value to range [min, max]
    /// </summary>
    private static void HandleClamp(FunctionArgs args)
    {
        if (args.Parameters.Length != 3)
        {
            args.Result = 0.0;
            return;
        }

        var value = Convert.ToDouble(args.Parameters[0].Evaluate());
        var min = Convert.ToDouble(args.Parameters[1].Evaluate());
        var max = Convert.ToDouble(args.Parameters[2].Evaluate());
        args.Result = Math.Clamp(value, min, max);
    }

    /// <summary>
    /// scale(value, inMin, inMax, outMin, outMax) - Linear scaling from input range to output range
    /// Example: scale([mA], 4, 20, 0, 100) converts 4-20mA to 0-100%
    /// </summary>
    private static void HandleScale(FunctionArgs args)
    {
        if (args.Parameters.Length != 5)
        {
            args.Result = 0.0;
            return;
        }

        var value = Convert.ToDouble(args.Parameters[0].Evaluate());
        var inMin = Convert.ToDouble(args.Parameters[1].Evaluate());
        var inMax = Convert.ToDouble(args.Parameters[2].Evaluate());
        var outMin = Convert.ToDouble(args.Parameters[3].Evaluate());
        var outMax = Convert.ToDouble(args.Parameters[4].Evaluate());

        // Avoid division by zero
        if (Math.Abs(inMax - inMin) < 1e-10)
        {
            args.Result = outMin;
            return;
        }

        // Linear interpolation
        var ratio = (value - inMin) / (inMax - inMin);
        args.Result = outMin + ratio * (outMax - outMin);
    }

    /// <summary>
    /// deadband(value, center, band) - Returns value if outside deadband, otherwise returns center
    /// Useful for filtering noise around a setpoint
    /// </summary>
    private static void HandleDeadband(FunctionArgs args)
    {
        if (args.Parameters.Length != 3)
        {
            args.Result = 0.0;
            return;
        }

        var value = Convert.ToDouble(args.Parameters[0].Evaluate());
        var center = Convert.ToDouble(args.Parameters[1].Evaluate());
        var band = Convert.ToDouble(args.Parameters[2].Evaluate());

        var halfBand = Math.Abs(band) / 2.0;
        if (Math.Abs(value - center) <= halfBand)
        {
            args.Result = center;
        }
        else
        {
            args.Result = value;
        }
    }

    /// <summary>
    /// iff(condition, trueValue, falseValue) - Inline conditional
    /// Returns trueValue if condition is non-zero, otherwise falseValue
    /// </summary>
    private static void HandleIff(FunctionArgs args)
    {
        if (args.Parameters.Length != 3)
        {
            args.Result = 0.0;
            return;
        }

        var condition = Convert.ToDouble(args.Parameters[0].Evaluate());
        var trueValue = Convert.ToDouble(args.Parameters[1].Evaluate());
        var falseValue = Convert.ToDouble(args.Parameters[2].Evaluate());

        args.Result = Math.Abs(condition) > 1e-10 ? trueValue : falseValue;
    }
}
