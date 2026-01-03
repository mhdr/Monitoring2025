using System.ComponentModel.DataAnnotations;

namespace Core.Models;

/// <summary>
/// Type of global variable (boolean or float)
/// </summary>
public enum GlobalVariableType
{
    /// <summary>
    /// Boolean variable (true/false)
    /// </summary>
    Boolean = 0,
    
    /// <summary>
    /// Float variable (double precision floating point)
    /// </summary>
    Float = 1
}

/// <summary>
/// Represents a global variable that can be shared across memories.
/// Global variables are lightweight, in-memory values (stored in Redis) that enable
/// data sharing between different memory types without needing to define full Points.
/// </summary>
/// <remarks>
/// Global Variables vs Points:
/// - Variables: Lightweight, minimal configuration, in-memory only (Redis)
/// - Points: Full-featured with scaling, calibration, history, controller interface
/// 
/// Use Cases:
/// - Intermediate calculations between memories
/// - Shared state across multiple memory instances
/// - Temporary values that don't need historical storage
/// - Configuration flags/parameters for memory logic
/// </remarks>
[Microsoft.EntityFrameworkCore.Index(nameof(Name), IsUnique = true)]
public class GlobalVariable
{
    /// <summary>
    /// Unique identifier
    /// </summary>
    [Key]
    public Guid Id { get; set; }
    
    /// <summary>
    /// Variable name (must be unique across the system)
    /// Naming convention: alphanumeric, underscore, hyphen only
    /// Example: "temp_setpoint", "alarm_override", "calc_result"
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Variable data type (Boolean or Float)
    /// </summary>
    [Required]
    public GlobalVariableType VariableType { get; set; }
    
    /// <summary>
    /// Optional description explaining the variable's purpose
    /// </summary>
    [MaxLength(500)]
    public string? Description { get; set; }
    
    /// <summary>
    /// Whether this variable is disabled (won't be processed or accessible)
    /// </summary>
    public bool IsDisabled { get; set; }
    
    /// <summary>
    /// When the variable was created
    /// </summary>
    public DateTime CreatedAt { get; set; }
    
    /// <summary>
    /// When the variable configuration was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}
