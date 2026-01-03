using Core.Libs;
using Core.RedisModels;
using Newtonsoft.Json;

namespace Core.Migrations;

/// <summary>
/// One-time migration: Convert GlobalVariable LastUpdateTime from milliseconds to seconds.
/// This aligns Global Variable timestamps with Point timestamps for consistent staleness checks.
/// </summary>
public static class MigrateGlobalVariableTimestamps
{
    /// <summary>
    /// Migrates all GlobalVariable timestamps in Redis from milliseconds to seconds.
    /// Safe to run multiple times (checks if conversion is needed before applying).
    /// </summary>
    public static async Task Run()
    {
        try
        {
            MyLog.Info("Starting Global Variable timestamp migration (milliseconds → seconds)");
            
            var db = RedisConnection.Instance.GetDatabase();
            var server = RedisConnection.Instance.GetServer();
            var keys = server.Keys(pattern: "GlobalVariable:*").ToArray();
            
            int migratedCount = 0;
            int skippedCount = 0;
            int errorCount = 0;

            foreach (var key in keys)
            {
                try
                {
                    var json = await db.StringGetAsync(key);
                    if (!json.HasValue)
                    {
                        skippedCount++;
                        continue;
                    }

                    var gv = JsonConvert.DeserializeObject<GlobalVariableRedis>(json.ToString());
                    if (gv == null)
                    {
                        errorCount++;
                        MyLog.Warning($"Failed to deserialize GlobalVariable: {key}");
                        continue;
                    }

                    // Check if timestamp is in milliseconds (year 2286 in seconds = 10,000,000,000)
                    // If LastUpdateTime > 10 billion, it's likely in milliseconds
                    if (gv.LastUpdateTime > 10_000_000_000)
                    {
                        long oldTimestamp = gv.LastUpdateTime;
                        gv.LastUpdateTime = gv.LastUpdateTime / 1000;  // Convert to seconds
                        
                        await db.StringSetAsync(key, JsonConvert.SerializeObject(gv));
                        
                        migratedCount++;
                        MyLog.Debug($"Migrated GV timestamp: {gv.Name} ({oldTimestamp}ms → {gv.LastUpdateTime}s)");
                    }
                    else
                    {
                        // Already in seconds or invalid timestamp
                        skippedCount++;
                    }
                }
                catch (Exception ex)
                {
                    errorCount++;
                    MyLog.Error($"Error migrating Global Variable {key}", ex);
                }
            }

            MyLog.Info($"Global Variable timestamp migration completed: {migratedCount} migrated, {skippedCount} skipped, {errorCount} errors");
        }
        catch (Exception ex)
        {
            MyLog.Error("Fatal error during Global Variable timestamp migration", ex);
            throw;
        }
    }
}
