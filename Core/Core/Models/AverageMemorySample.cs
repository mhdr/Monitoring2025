using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

/// <summary>
/// Sample history entry for Average Memory (Moving Average).
/// Stored in database table for persistence across restarts.
/// Supports efficient windowed queries with composite index on (memory_id, timestamp DESC).
/// Cleaned up periodically by dedicated cleanup job.
/// </summary>
[Table("average_memory_sample")]
public class AverageMemorySample
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    
    /// <summary>
    /// Foreign key to parent AverageMemory
    /// </summary>
    [Column("average_memory_id")]
    public Guid AverageMemoryId { get; set; }
    
    /// <summary>
    /// Timestamp when sample was recorded (Unix epoch seconds)
    /// </summary>
    [Column("timestamp")]
    public long Timestamp { get; set; }
    
    /// <summary>
    /// Input value at this sample point
    /// </summary>
    [Column("value")]
    public double Value { get; set; }
    
    /// <summary>
    /// Navigation property to parent memory
    /// </summary>
    [ForeignKey("AverageMemoryId")]
    public virtual AverageMemory? AverageMemory { get; set; }
}
