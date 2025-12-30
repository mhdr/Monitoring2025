using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

/// <summary>
/// Sample history entry for Rate of Change Memory
/// Stored in separate table for performance with large time windows
/// Maintains FIFO ordering for sliding window calculations
/// </summary>
[Table("rate_of_change_sample")]
public class RateOfChangeSample
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    
    /// <summary>
    /// Foreign key to parent RateOfChangeMemory
    /// </summary>
    [Column("rate_of_change_memory_id")]
    public Guid RateOfChangeMemoryId { get; set; }
    
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
    [ForeignKey("RateOfChangeMemoryId")]
    public virtual RateOfChangeMemory? RateOfChangeMemory { get; set; }
}
