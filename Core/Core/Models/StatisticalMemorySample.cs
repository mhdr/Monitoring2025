using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

/// <summary>
/// Sample history entry for Statistical Memory.
/// Stored in database table for persistence across restarts.
/// Supports efficient windowed queries with composite index on (memory_id, timestamp DESC).
/// Cleaned up periodically by dedicated cleanup job.
/// </summary>
[Table("statistical_memory_sample")]
public class StatisticalMemorySample
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    
    /// <summary>
    /// Foreign key to parent StatisticalMemory
    /// </summary>
    [Column("statistical_memory_id")]
    public Guid StatisticalMemoryId { get; set; }
    
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
    [ForeignKey("StatisticalMemoryId")]
    public virtual StatisticalMemory? StatisticalMemory { get; set; }
}
