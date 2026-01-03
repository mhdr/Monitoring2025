using System.Globalization;
using Core.Libs;
using Core.Models;
using Core.RedisModels;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;

namespace Core;

/// <summary>
/// Processes Global Variable configurations.
/// Manages lightweight in-memory variables that can be shared across memories.
/// Global variables are stored in Redis for fast access and synchronized with database configuration.
/// </summary>
public class GlobalVariableProcess
{
    // Singleton instance
    private static GlobalVariableProcess? _instance;
    private static readonly object _lock = new object();
    private static Task? _runTask;

    private DataContext? _context;

    // Cache of global variables for fast access
    private Dictionary<string, GlobalVariableRedis> _variableCache = new();
    private long _lastCacheUpdateTime = 0;
    private const int CacheUpdateInterval = 10; // Update cache from DB every 10 seconds

    // Private constructor to enforce Singleton
    private GlobalVariableProcess()
    {
        _context = null;
    }

    // Singleton instance access
    public static GlobalVariableProcess Instance
    {
        get
        {
            lock (_lock)
            {
                if (_instance == null)
                {
                    _instance = new GlobalVariableProcess();
                }
            }

            return _instance;
        }
    }

    public async Task Run()
    {
        lock (_lock)
        {
            if (_runTask == null)
            {
                _runTask = Task.Run(async () =>
                {
                    // Wait for database to be ready at startup
                    await WaitForDatabaseConnection();
                    
                    while (true)
                    {
                        try
                        {
                            await using (_context = new DataContext())
                            {
                                await Process();
                            }
                        }
                        catch (Exception ex)
                        {
                            MyLog.LogJson(ex);
                        }
                        finally
                        {
                            await Task.Delay(1000); // Process every 1 second
                        }
                    }
                });
            }
        }

        await _runTask;
    }

    private async Task WaitForDatabaseConnection()
    {
        int maxRetries = 30;
        int retryDelay = 2000; // 2 seconds

        for (int i = 0; i < maxRetries; i++)
        {
            try
            {
                using var testContext = new DataContext();
                await testContext.Database.CanConnectAsync();
                MyLog.LogJson("GlobalVariableProcess", "Database connection established");
                return;
            }
            catch (Exception ex)
            {
                MyLog.LogJson("GlobalVariableProcess", $"Waiting for database connection... Attempt {i + 1}/{maxRetries}");
                if (i == maxRetries - 1)
                {
                    MyLog.LogJson(ex);
                    throw;
                }
                await Task.Delay(retryDelay);
            }
        }
    }

    /// <summary>
    /// Main processing loop: Synchronizes database configuration to Redis
    /// </summary>
    public async Task Process()
    {
        long currentTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        // Update cache from database periodically
        if (currentTime - _lastCacheUpdateTime >= CacheUpdateInterval)
        {
            await SyncFromDatabase();
            _lastCacheUpdateTime = currentTime;
        }
    }

    /// <summary>
    /// Synchronizes global variable definitions from database to Redis
    /// </summary>
    private async Task SyncFromDatabase()
    {
        var variables = await _context!.GlobalVariables
            .Where(v => !v.IsDisabled)
            .ToListAsync();

        var db = RedisConnection.Instance.GetDatabase();
        var newCache = new Dictionary<string, GlobalVariableRedis>();

        foreach (var variable in variables)
        {
            var key = $"GlobalVariable:{variable.Id}";
            
            // Check if variable already exists in Redis
            var existingJson = await db.StringGetAsync(key);
            GlobalVariableRedis redisVar;

            if (existingJson.HasValue)
            {
                // Variable exists, preserve its current value
                redisVar = JsonConvert.DeserializeObject<GlobalVariableRedis>(existingJson.ToString())!;
                
                // Update metadata from database (name, type may have changed)
                redisVar.Name = variable.Name;
                redisVar.VariableType = variable.VariableType;
            }
            else
            {
                // New variable, initialize with default value
                redisVar = new GlobalVariableRedis
                {
                    Id = variable.Id,
                    Name = variable.Name,
                    VariableType = variable.VariableType,
                    Value = variable.VariableType == GlobalVariableType.Boolean ? "false" : "0",
                    LastUpdateTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                };
            }

            // Write to Redis
            await db.StringSetAsync(key, JsonConvert.SerializeObject(redisVar));
            newCache[variable.Name] = redisVar;

            MyLog.Debug("Synced global variable to Redis", new Dictionary<string, object?>
            {
                ["VariableId"] = variable.Id,
                ["VariableName"] = variable.Name,
                ["Type"] = variable.VariableType,
                ["Value"] = redisVar.Value
            });
        }

        // Update local cache
        _variableCache = newCache;

        MyLog.Debug("Global variables synchronized", new Dictionary<string, object?>
        {
            ["Count"] = variables.Count
        });
    }

    /// <summary>
    /// Get a global variable value by name (thread-safe)
    /// </summary>
    /// <param name="name">Variable name</param>
    /// <returns>Tuple of (found, value, type)</returns>
    public static async Task<(bool Found, object? Value, GlobalVariableType? Type)> GetVariable(string name)
    {
        try
        {
            var instance = Instance;
            
            // Try cache first
            if (instance._variableCache.TryGetValue(name, out var cached))
            {
                return (true, ParseValue(cached.Value, cached.VariableType), cached.VariableType);
            }

            // Cache miss, try Redis directly
            var db = RedisConnection.Instance.GetDatabase();
            var server = RedisConnection.Instance.GetServer();
            var keys = server.Keys(pattern: "GlobalVariable:*").ToArray();

            foreach (var key in keys)
            {
                var json = await db.StringGetAsync(key);
                if (!json.HasValue) continue;

                var redisVar = JsonConvert.DeserializeObject<GlobalVariableRedis>(json.ToString());
                if (redisVar != null && redisVar.Name == name)
                {
                    return (true, ParseValue(redisVar.Value, redisVar.VariableType), redisVar.VariableType);
                }
            }

            return (false, null, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to get global variable", ex, new Dictionary<string, object?>
            {
                ["VariableName"] = name
            });
            return (false, null, null);
        }
    }

    /// <summary>
    /// Set a global variable value by name with validation (thread-safe)
    /// </summary>
    /// <param name="name">Variable name</param>
    /// <param name="value">Value to set (bool or double)</param>
    /// <returns>Tuple of (success, errorMessage)</returns>
    public static async Task<(bool Success, string? ErrorMessage)> SetVariable(string name, object value)
    {
        try
        {
            var instance = Instance;
            
            // Find variable in cache or Redis
            GlobalVariableRedis? redisVar = null;
            
            if (instance._variableCache.TryGetValue(name, out var cached))
            {
                redisVar = cached;
            }
            else
            {
                // Cache miss, search Redis
                var db = RedisConnection.Instance.GetDatabase();
                var server = RedisConnection.Instance.GetServer();
                var keys = server.Keys(pattern: "GlobalVariable:*").ToArray();

                foreach (var key in keys)
                {
                    var json = await db.StringGetAsync(key);
                    if (!json.HasValue) continue;

                    var tempVar = JsonConvert.DeserializeObject<GlobalVariableRedis>(json.ToString());
                    if (tempVar != null && tempVar.Name == name)
                    {
                        redisVar = tempVar;
                        break;
                    }
                }
            }

            if (redisVar == null)
            {
                return (false, $"Global variable '{name}' not found");
            }

            // Validate and convert value based on type
            string stringValue;
            
            if (redisVar.VariableType == GlobalVariableType.Boolean)
            {
                if (value is bool boolVal)
                {
                    stringValue = boolVal.ToString().ToLower();
                }
                else if (value is string strVal)
                {
                    if (bool.TryParse(strVal, out var parsedBool))
                    {
                        stringValue = parsedBool.ToString().ToLower();
                    }
                    else
                    {
                        return (false, $"Invalid boolean value for variable '{name}': {value}");
                    }
                }
                else
                {
                    return (false, $"Variable '{name}' expects a boolean value");
                }
            }
            else if (redisVar.VariableType == GlobalVariableType.Float)
            {
                double doubleVal;
                
                if (value is double dVal)
                {
                    doubleVal = dVal;
                }
                else if (value is float fVal)
                {
                    doubleVal = fVal;
                }
                else if (value is int iVal)
                {
                    doubleVal = iVal;
                }
                else if (value is string strVal)
                {
                    if (!double.TryParse(strVal, NumberStyles.Float, CultureInfo.InvariantCulture, out doubleVal))
                    {
                        return (false, $"Invalid float value for variable '{name}': {value}");
                    }
                }
                else
                {
                    return (false, $"Variable '{name}' expects a float value");
                }

                // Validate for NaN and Infinity
                if (double.IsNaN(doubleVal))
                {
                    return (false, $"Variable '{name}' cannot be set to NaN");
                }
                if (double.IsInfinity(doubleVal))
                {
                    return (false, $"Variable '{name}' cannot be set to Infinity");
                }

                stringValue = doubleVal.ToString(CultureInfo.InvariantCulture);
            }
            else
            {
                return (false, $"Unknown variable type for '{name}'");
            }

            // Update Redis
            redisVar.Value = stringValue;
            redisVar.LastUpdateTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

            var db2 = RedisConnection.Instance.GetDatabase();
            var key2 = $"GlobalVariable:{redisVar.Id}";
            await db2.StringSetAsync(key2, JsonConvert.SerializeObject(redisVar));

            // Update cache
            instance._variableCache[name] = redisVar;

            MyLog.Debug("Global variable updated", new Dictionary<string, object?>
            {
                ["VariableName"] = name,
                ["NewValue"] = stringValue,
                ["Type"] = redisVar.VariableType
            });

            return (true, null);
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to set global variable", ex, new Dictionary<string, object?>
            {
                ["VariableName"] = name,
                ["Value"] = value
            });
            return (false, $"Exception: {ex.Message}");
        }
    }

    /// <summary>
    /// Get multiple global variables in a batch (optimized for performance)
    /// </summary>
    /// <param name="names">List of variable names</param>
    /// <returns>Dictionary mapping name to (value, type)</returns>
    public static async Task<Dictionary<string, (object? Value, GlobalVariableType Type)>> GetVariablesBatch(List<string> names)
    {
        var result = new Dictionary<string, (object?, GlobalVariableType)>();
        
        if (names == null || names.Count == 0)
            return result;

        try
        {
            var db = RedisConnection.Instance.GetDatabase();
            var server = RedisConnection.Instance.GetServer();
            var keys = server.Keys(pattern: "GlobalVariable:*").ToArray();

            // Batch fetch all global variables
            var values = await db.StringGetAsync(keys);

            for (int i = 0; i < values.Length; i++)
            {
                if (!values[i].HasValue || values[i].IsNullOrEmpty)
                    continue;

                var redisVar = JsonConvert.DeserializeObject<GlobalVariableRedis>(values[i].ToString());
                if (redisVar != null && names.Contains(redisVar.Name))
                {
                    result[redisVar.Name] = (ParseValue(redisVar.Value, redisVar.VariableType), redisVar.VariableType);
                }
            }

            MyLog.Debug("Batch retrieved global variables", new Dictionary<string, object?>
            {
                ["RequestedCount"] = names.Count,
                ["FoundCount"] = result.Count
            });
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to batch retrieve global variables", ex, new Dictionary<string, object?>
            {
                ["RequestedCount"] = names.Count
            });
        }

        return result;
    }

    /// <summary>
    /// Get all global variables with their current values (for UI display)
    /// </summary>
    /// <returns>List of global variables with their runtime values</returns>
    public static async Task<List<(GlobalVariable Config, string CurrentValue, long LastUpdateTime)>> GetAllVariablesWithValues()
    {
        var result = new List<(GlobalVariable, string, long)>();

        try
        {
            using var context = new DataContext();
            var variables = await context.GlobalVariables.ToListAsync();

            var db = RedisConnection.Instance.GetDatabase();

            foreach (var variable in variables)
            {
                var key = $"GlobalVariable:{variable.Id}";
                var json = await db.StringGetAsync(key);

                string currentValue = variable.VariableType == GlobalVariableType.Boolean ? "false" : "0";
                long lastUpdateTime = 0;

                if (json.HasValue)
                {
                    var redisVar = JsonConvert.DeserializeObject<GlobalVariableRedis>(json.ToString());
                    if (redisVar != null)
                    {
                        currentValue = redisVar.Value;
                        lastUpdateTime = redisVar.LastUpdateTime;
                    }
                }

                result.Add((variable, currentValue, lastUpdateTime));
            }
        }
        catch (Exception ex)
        {
            MyLog.Error("Failed to get all global variables with values", ex);
        }

        return result;
    }

    /// <summary>
    /// Parse string value to appropriate type
    /// </summary>
    private static object? ParseValue(string value, GlobalVariableType type)
    {
        if (type == GlobalVariableType.Boolean)
        {
            if (bool.TryParse(value, out var boolVal))
                return boolVal;
            return false;
        }
        else if (type == GlobalVariableType.Float)
        {
            if (double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var doubleVal))
                return doubleVal;
            return 0.0;
        }

        return null;
    }
}
