using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

/// <summary>
/// Represents a timeout monitoring configuration that tracks an input item's update frequency
/// and sets an output item's value based on whether the input is being updated regularly.
/// </summary>
/// <remarks>
/// The TimeoutMemoryProcess checks the input item every second:
/// - If (CurrentTime - InputItemTime) > Timeout: Output is set to "1" (timeout exceeded)
/// - Otherwise: Output is set to "0" (input is updating regularly)
/// </remarks>
[Table("timeout_memory")]
public class TimeoutMemory
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    /// <summary>
    /// The item to monitor for timeout. Its last update timestamp is checked every second.
    /// Can be any ItemType (DigitalInput, DigitalOutput, AnalogInput, AnalogOutput).
    /// </summary>
    [Column("input_item_id")] public Guid InputItemId { get; set; }
    
    /// <summary>
    /// The Digital Output item that receives the timeout status:
    /// - Value "0" = Input item is being updated regularly
    /// - Value "1" = Input item timeout exceeded
    /// Must be ItemType.DigitalOutput.
    /// </summary>
    [Column("output_item_id")] public Guid OutputItemId { get; set; }
    
    /// <summary>
    /// Timeout duration in seconds. If the input item is not updated within this time,
    /// the output item will be set to "1".
    /// </summary>
    [Column("timeout")] public long Timeout { get; set; }
}