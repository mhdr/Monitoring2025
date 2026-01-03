using System.Linq.Expressions;
using System.Text.Json;
using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

namespace Core;

/// <summary>
/// Represents a reference to a memory that uses a global variable
/// </summary>
public class MemoryReference
{
    public Guid MemoryId { get; set; }
    public string MemoryType { get; set; } = string.Empty;
    public string? MemoryName { get; set; }
    public string UsageContext { get; set; } = string.Empty; // "Input", "Output", "Condition", "Expression"
}

/// <summary>
/// Usage cache for global variables with Redis-based storage
/// </summary>
public static class GlobalVariableUsageCache
{
    private const string USAGE_KEY_PREFIX = "UsageIndex:GlobalVariable:";
    private static readonly TimeSpan CACHE_EXPIRY = TimeSpan.FromMinutes(5);

    /// <summary>
    /// Get cached usage for a variable (fast lookup)
    /// </summary>
    public static async Task<List<MemoryReference>> GetUsage(string variableName)
    {
        try
        {
            var db = RedisConnection.Instance.GetDatabase();
            var key = $"{USAGE_KEY_PREFIX}{variableName}";
            
            var values = await db.SetMembersAsync(key);
            if (values.Length == 0)
            {
                // Cache miss - rebuild and return
                return await RebuildUsageCache(variableName);
            }

            var references = new List<MemoryReference>();
            foreach (var value in values)
            {
                var parts = value.ToString().Split('|');
                if (parts.Length >= 3)
                {
                    references.Add(new MemoryReference
                    {
                        MemoryType = parts[0],
                        MemoryId = Guid.Parse(parts[1]),
                        UsageContext = parts[2],
                        MemoryName = parts.Length > 3 ? parts[3] : null
                    });
                }
            }

            return references;
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to get cached usage", ex, new Dictionary<string, object?>
            {
                ["VariableName"] = variableName
            });
            // Fallback to direct scan
            return await GlobalVariables.FindUsagesDirectScan(variableName);
        }
    }

    /// <summary>
    /// Rebuild usage cache for a specific variable
    /// </summary>
    public static async Task<List<MemoryReference>> RebuildUsageCache(string variableName)
    {
        try
        {
            var references = await GlobalVariables.FindUsagesDirectScan(variableName);
            
            var db = RedisConnection.Instance.GetDatabase();
            var key = $"{USAGE_KEY_PREFIX}{variableName}";
            
            // Clear existing cache
            await db.KeyDeleteAsync(key);
            
            // Store new references
            if (references.Count > 0)
            {
                var values = references.Select(r => 
                    (RedisValue)$"{r.MemoryType}|{r.MemoryId}|{r.UsageContext}|{r.MemoryName ?? ""}"
                ).ToArray();
                
                await db.SetAddAsync(key, values);
                await db.KeyExpireAsync(key, CACHE_EXPIRY);
            }

            return references;
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to rebuild usage cache", ex, new Dictionary<string, object?>
            {
                ["VariableName"] = variableName
            });
            return new List<MemoryReference>();
        }
    }

    /// <summary>
    /// Invalidate cache for a specific variable
    /// </summary>
    public static async Task InvalidateCache(string variableName)
    {
        try
        {
            var db = RedisConnection.Instance.GetDatabase();
            var key = $"{USAGE_KEY_PREFIX}{variableName}";
            await db.KeyDeleteAsync(key);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to invalidate cache", ex, new Dictionary<string, object?>
            {
                ["VariableName"] = variableName
            });
        }
    }

    /// <summary>
    /// Called when a memory that might reference global variables is modified
    /// </summary>
    public static async Task OnMemoryChanged(Guid memoryId, string memoryType)
    {
        try
        {
            // Find all variables referenced by this memory and invalidate their caches
            await using var context = new DataContext();
            
            if (memoryType == "TimeoutMemory")
            {
                var memory = await context.TimeoutMemories.FindAsync(memoryId);
                if (memory != null)
                {
                    if (memory.InputType == TimeoutSourceType.GlobalVariable)
                        await InvalidateCache(memory.InputReference);
                    if (memory.OutputType == TimeoutSourceType.GlobalVariable)
                        await InvalidateCache(memory.OutputReference);
                }
            }
            else if (memoryType == "FormulaMemory")
            {
                var memory = await context.FormulaMemories.FindAsync(memoryId);
                if (memory != null)
                {
                    var aliases = JsonSerializer.Deserialize<Dictionary<string, string>>(memory.VariableAliases ?? "{}");
                    if (aliases != null)
                    {
                        foreach (var reference in aliases.Values.Where(v => v.StartsWith("@GV:")))
                        {
                            await InvalidateCache(reference.Substring(4));
                        }
                    }
                }
            }
            else if (memoryType == "IfMemory")
            {
                var memory = await context.IfMemories.FindAsync(memoryId);
                if (memory != null)
                {
                    var aliases = JsonSerializer.Deserialize<Dictionary<string, string>>(memory.VariableAliases ?? "{}");
                    if (aliases != null)
                    {
                        foreach (var reference in aliases.Values.Where(v => v.StartsWith("@GV:")))
                        {
                            await InvalidateCache(reference.Substring(4));
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to handle memory change event", ex, new Dictionary<string, object?>
            {
                ["MemoryId"] = memoryId,
                ["MemoryType"] = memoryType
            });
        }
    }
}

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

            // Check if name has changed - use atomic rename if so
            if (existing.Name != globalVariable.Name)
            {
                await context.DisposeAsync();
                
                // Use SafeRenameGlobalVariable for atomic rename with cascade updates
                var (success, errorMessage, updatedMemories) = await SafeRenameGlobalVariable(
                    globalVariable.Id, 
                    globalVariable.Name);
                
                if (!success)
                {
                    return (false, errorMessage);
                }

                // After successful rename, update other fields
                context = new DataContext();
                existing = await context.GlobalVariables.FindAsync(globalVariable.Id);
                if (existing == null)
                {
                    await context.DisposeAsync();
                    return (false, "Global variable not found after rename");
                }
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

            // Update configuration fields (name already updated if rename was called)
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

            // Check if variable is in use
            var usages = await FindUsagesDirectScan(existing.Name);
            if (usages.Count > 0)
            {
                await context.DisposeAsync();
                var memoryTypes = usages.GroupBy(u => u.MemoryType)
                    .Select(g => $"{g.Key} ({g.Count()})")
                    .ToList();
                return (false, $"Cannot delete variable '{existing.Name}'. It is used in {usages.Count} memory(ies): {string.Join(", ", memoryTypes)}");
            }

            context.GlobalVariables.Remove(existing);
            await context.SaveChangesAsync();
            await context.DisposeAsync();

            // Invalidate cache
            await GlobalVariableUsageCache.InvalidateCache(existing.Name);

            return (true, null);
        }
        catch (Exception ex)
        {
            return (false, ex.Message);
        }
    }

    /// <summary>
    /// Safely rename a global variable with atomic transaction across all memories
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage, int UpdatedMemories)> SafeRenameGlobalVariable(
        Guid variableId, 
        string newName)
    {
        await using var context = new DataContext();
        await using var transaction = await context.Database.BeginTransactionAsync();
        
        try
        {
            // 1. Get existing variable
            var variable = await context.GlobalVariables.FindAsync(variableId);
            if (variable == null)
            {
                await transaction.RollbackAsync();
                return (false, "Variable not found", 0);
            }

            var oldName = variable.Name;
            
            // If name hasn't changed, nothing to do
            if (oldName == newName)
            {
                await transaction.RollbackAsync();
                return (true, null, 0);
            }

            // 2. Validate new name
            if (!System.Text.RegularExpressions.Regex.IsMatch(newName, @"^[a-zA-Z0-9_\-]+$"))
            {
                await transaction.RollbackAsync();
                return (false, "Variable name can only contain letters, numbers, underscores, and hyphens", 0);
            }

            // Check for duplicate name
            var duplicate = await context.GlobalVariables
                .FirstOrDefaultAsync(v => v.Name == newName && v.Id != variableId);
            if (duplicate != null)
            {
                await transaction.RollbackAsync();
                return (false, $"A global variable with name '{newName}' already exists", 0);
            }

            int totalUpdated = 0;

            // 3. Update TimeoutMemory references
            var timeoutMemories = await context.TimeoutMemories
                .Where(tm => 
                    (tm.InputType == TimeoutSourceType.GlobalVariable && tm.InputReference == oldName) ||
                    (tm.OutputType == TimeoutSourceType.GlobalVariable && tm.OutputReference == oldName))
                .ToListAsync();
            
            foreach (var tm in timeoutMemories)
            {
                if (tm.InputReference == oldName) tm.InputReference = newName;
                if (tm.OutputReference == oldName) tm.OutputReference = newName;
            }
            
            if (timeoutMemories.Count > 0)
            {
                context.TimeoutMemories.UpdateRange(timeoutMemories);
                totalUpdated += timeoutMemories.Count;
            }

            // 4. Update FormulaMemory VariableAliases JSON (future support for @GV: prefix)
            var formulaMemories = await context.FormulaMemories.ToListAsync();
            var updatedFormulaMemories = new List<FormulaMemory>();
            
            foreach (var fm in formulaMemories)
            {
                try
                {
                    var aliases = JsonSerializer.Deserialize<Dictionary<string, string>>(fm.VariableAliases ?? "{}");
                    if (aliases != null)
                    {
                        bool modified = false;
                        foreach (var kvp in aliases.ToList())
                        {
                            if (kvp.Value.StartsWith("@GV:") && kvp.Value.Substring(4) == oldName)
                            {
                                aliases[kvp.Key] = $"@GV:{newName}";
                                modified = true;
                            }
                        }
                        
                        if (modified)
                        {
                            fm.VariableAliases = JsonSerializer.Serialize(aliases);
                            updatedFormulaMemories.Add(fm);
                        }
                    }
                }
                catch (JsonException)
                {
                    // Skip invalid JSON
                    continue;
                }
            }
            
            if (updatedFormulaMemories.Count > 0)
            {
                context.FormulaMemories.UpdateRange(updatedFormulaMemories);
                totalUpdated += updatedFormulaMemories.Count;
            }

            // 5. Update IfMemory VariableAliases JSON (future support for @GV: prefix)
            var ifMemories = await context.IfMemories.ToListAsync();
            var updatedIfMemories = new List<IfMemory>();
            
            foreach (var im in ifMemories)
            {
                try
                {
                    var aliases = JsonSerializer.Deserialize<Dictionary<string, string>>(im.VariableAliases ?? "{}");
                    if (aliases != null)
                    {
                        bool modified = false;
                        foreach (var kvp in aliases.ToList())
                        {
                            if (kvp.Value.StartsWith("@GV:") && kvp.Value.Substring(4) == oldName)
                            {
                                aliases[kvp.Key] = $"@GV:{newName}";
                                modified = true;
                            }
                        }
                        
                        if (modified)
                        {
                            im.VariableAliases = JsonSerializer.Serialize(aliases);
                            updatedIfMemories.Add(im);
                        }
                    }
                }
                catch (JsonException)
                {
                    // Skip invalid JSON
                    continue;
                }
            }
            
            if (updatedIfMemories.Count > 0)
            {
                context.IfMemories.UpdateRange(updatedIfMemories);
                totalUpdated += updatedIfMemories.Count;
            }

            // 6. Update the GlobalVariable itself
            variable.Name = newName;
            variable.UpdatedAt = DateTime.UtcNow;
            context.GlobalVariables.Update(variable);

            // 7. Commit transaction
            await context.SaveChangesAsync();
            await transaction.CommitAsync();

            // 8. Invalidate Redis caches (after successful commit)
            try
            {
                var db = RedisConnection.Instance.GetDatabase();
                await db.KeyDeleteAsync($"GlobalVariable:{variableId}");
                await GlobalVariableUsageCache.InvalidateCache(oldName);
                await GlobalVariableUsageCache.InvalidateCache(newName);

                // Note: TimeoutMemoryProcess doesn't have InvalidateCache method
                // The timeout memories will pick up changes on next processing cycle
            }
            catch (Exception ex)
            {
                MyLog.Error("Failed to invalidate caches after rename", ex, new Dictionary<string, object?>
                {
                    ["OldName"] = oldName,
                    ["NewName"] = newName
                });
                // Don't fail the operation if cache invalidation fails
            }

            return (true, null, totalUpdated);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            MyLog.Error("Failed to rename global variable", ex, new Dictionary<string, object?>
            {
                ["VariableId"] = variableId,
                ["NewName"] = newName
            });
            return (false, ex.Message, 0);
        }
    }

    /// <summary>
    /// Find all usages of a global variable (cached with fallback to direct scan)
    /// </summary>
    public static async Task<List<MemoryReference>> FindUsages(string variableName)
    {
        return await GlobalVariableUsageCache.GetUsage(variableName);
    }

    /// <summary>
    /// Direct scan of all memory types for global variable usage (no cache)
    /// </summary>
    public static async Task<List<MemoryReference>> FindUsagesDirectScan(string variableName)
    {
        var references = new List<MemoryReference>();
        
        try
        {
            await using var context = new DataContext();

            // 1. Scan TimeoutMemory
            var timeoutMemories = await context.TimeoutMemories.ToListAsync();
            foreach (var tm in timeoutMemories)
            {
                if (tm.InputType == TimeoutSourceType.GlobalVariable && tm.InputReference == variableName)
                {
                    references.Add(new MemoryReference
                    {
                        MemoryId = tm.Id,
                        MemoryType = "TimeoutMemory",
                        MemoryName = null, // TimeoutMemory doesn't have a Name property
                        UsageContext = "Input"
                    });
                }
                
                if (tm.OutputType == TimeoutSourceType.GlobalVariable && tm.OutputReference == variableName)
                {
                    references.Add(new MemoryReference
                    {
                        MemoryId = tm.Id,
                        MemoryType = "TimeoutMemory",
                        MemoryName = null, // TimeoutMemory doesn't have a Name property
                        UsageContext = "Output"
                    });
                }
            }

            // 2. Scan FormulaMemory for @GV: references in VariableAliases
            var formulaMemories = await context.FormulaMemories.ToListAsync();
            foreach (var fm in formulaMemories)
            {
                try
                {
                    var aliases = JsonSerializer.Deserialize<Dictionary<string, string>>(fm.VariableAliases ?? "{}");
                    if (aliases != null)
                    {
                        foreach (var kvp in aliases)
                        {
                            if (kvp.Value.StartsWith("@GV:") && kvp.Value.Substring(4) == variableName)
                            {
                                references.Add(new MemoryReference
                                {
                                    MemoryId = fm.Id,
                                    MemoryType = "FormulaMemory",
                                    MemoryName = fm.Name,
                                    UsageContext = $"Expression (alias: {kvp.Key})"
                                });
                            }
                        }
                    }
                }
                catch (JsonException)
                {
                    // Skip invalid JSON
                    continue;
                }
            }

            // 3. Scan IfMemory for @GV: references in VariableAliases
            var ifMemories = await context.IfMemories.ToListAsync();
            foreach (var im in ifMemories)
            {
                try
                {
                    var aliases = JsonSerializer.Deserialize<Dictionary<string, string>>(im.VariableAliases ?? "{}");
                    if (aliases != null)
                    {
                        foreach (var kvp in aliases)
                        {
                            if (kvp.Value.StartsWith("@GV:") && kvp.Value.Substring(4) == variableName)
                            {
                                references.Add(new MemoryReference
                                {
                                    MemoryId = im.Id,
                                    MemoryType = "IfMemory",
                                    MemoryName = im.Name,
                                    UsageContext = $"Condition (alias: {kvp.Key})"
                                });
                            }
                        }
                    }
                }
                catch (JsonException)
                {
                    // Skip invalid JSON
                    continue;
                }
            }
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to scan for global variable usages", ex, new Dictionary<string, object?>
            {
                ["VariableName"] = variableName
            });
        }

        return references;
    }
}
