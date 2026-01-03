using Core.Models;

namespace Core.RedisModels;

/// <summary>
/// Redis model for global variable runtime values.
/// Stored in Redis for fast access across all memory processes.
/// </summary>
public class GlobalVariableRedis
{
    /// <summary>
    /// Variable unique identifier
    /// </summary>
    public Guid Id { get; set; }
    
    /// <summary>
    /// Variable name (for easy identification)
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Variable data type (Boolean or Float)
    /// </summary>
    public GlobalVariableType VariableType { get; set; }
    
    /// <summary>
    /// Current value (stored as string: "true"/"false" for boolean, numeric string for float)
    /// </summary>
    public string Value { get; set; } = string.Empty;
    
    /// <summary>
    /// Unix timestamp (milliseconds) when the value was last updated
    /// </summary>
    public long LastUpdateTime { get; set; }
}
