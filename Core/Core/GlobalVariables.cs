using System.Linq.Expressions;
using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Core;

/// <summary>
/// Helper class for GlobalVariable CRUD operations
/// </summary>
public class GlobalVariables
{
    /// <summary>
    /// Get all global variables
    /// </summary>
    public static async Task<List<GlobalVariable>?> GetGlobalVariables()
    {
        var context = new DataContext();
        var found = await context.GlobalVariables.ToListAsync();
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Get a specific global variable by predicate
    /// </summary>
    public static async Task<GlobalVariable?> GetGlobalVariable(Expression<Func<GlobalVariable, bool>> predicate)
    {
        var context = new DataContext();
        var found = await context.GlobalVariables.FirstOrDefaultAsync(predicate);
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Get a specific global variable by name
    /// </summary>
    public static async Task<GlobalVariable?> GetGlobalVariableByName(string name)
    {
        var context = new DataContext();
        var found = await context.GlobalVariables.FirstOrDefaultAsync(v => v.Name == name);
        await context.DisposeAsync();
        return found;
    }

    /// <summary>
    /// Add a new global variable
    /// </summary>
    public static async Task<(bool Success, Guid? Id, string? ErrorMessage)> AddGlobalVariable(GlobalVariable globalVariable)
    {
        try
        {
            var context = new DataContext();

            // Validate name uniqueness
            var existing = await context.GlobalVariables
                .FirstOrDefaultAsync(v => v.Name == globalVariable.Name);
            
            if (existing != null)
            {
                await context.DisposeAsync();
                return (false, null, $"A global variable with name '{globalVariable.Name}' already exists");
            }

            // Validate name format (alphanumeric, underscore, hyphen only)
            if (!System.Text.RegularExpressions.Regex.IsMatch(globalVariable.Name, @"^[a-zA-Z0-9_\-]+$"))
            {
                await context.DisposeAsync();
                return (false, null, "Variable name can only contain letters, numbers, underscores, and hyphens");
            }

            globalVariable.CreatedAt = DateTime.UtcNow;
            globalVariable.UpdatedAt = DateTime.UtcNow;

            context.GlobalVariables.Add(globalVariable);
            await context.SaveChangesAsync();
            await context.DisposeAsync();

            return (true, globalVariable.Id, null);
        }
        catch (Exception ex)
        {
            return (false, null, ex.Message);
        }
    }

    /// <summary>
    /// Edit an existing global variable (configuration only, not the value)
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> EditGlobalVariable(GlobalVariable globalVariable)
    {
        try
        {
            var context = new DataContext();

            var existing = await context.GlobalVariables.FindAsync(globalVariable.Id);
            if (existing == null)
            {
                await context.DisposeAsync();
                return (false, "Global variable not found");
            }

            // Check name uniqueness (excluding current variable)
            var duplicateName = await context.GlobalVariables
                .FirstOrDefaultAsync(v => v.Name == globalVariable.Name && v.Id != globalVariable.Id);
            
            if (duplicateName != null)
            {
                await context.DisposeAsync();
                return (false, $"A global variable with name '{globalVariable.Name}' already exists");
            }

            // Validate name format
            if (!System.Text.RegularExpressions.Regex.IsMatch(globalVariable.Name, @"^[a-zA-Z0-9_\-]+$"))
            {
                await context.DisposeAsync();
                return (false, "Variable name can only contain letters, numbers, underscores, and hyphens");
            }

            // Update configuration fields only (preserve runtime value)
            existing.Name = globalVariable.Name;
            existing.VariableType = globalVariable.VariableType;
            existing.Description = globalVariable.Description;
            existing.IsDisabled = globalVariable.IsDisabled;
            existing.UpdatedAt = DateTime.UtcNow;

            await context.SaveChangesAsync();
            await context.DisposeAsync();

            return (true, null);
        }
        catch (Exception ex)
        {
            return (false, ex.Message);
        }
    }

    /// <summary>
    /// Delete a global variable
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> DeleteGlobalVariable(Guid id)
    {
        try
        {
            var context = new DataContext();

            var existing = await context.GlobalVariables.FindAsync(id);
            if (existing == null)
            {
                await context.DisposeAsync();
                return (false, "Global variable not found");
            }

            context.GlobalVariables.Remove(existing);
            await context.SaveChangesAsync();
            await context.DisposeAsync();

            return (true, null);
        }
        catch (Exception ex)
        {
            return (false, ex.Message);
        }
    }
}
