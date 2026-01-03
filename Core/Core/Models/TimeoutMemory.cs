using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

/// <summary>
/// Specifies the source type for timeout memory input or output
/// </summary>
public enum TimeoutSourceType
{
    /// <summary>
    /// Reference is a Point (MonitoringItem) GUID
    /// </summary>
    Point = 0,
    
    /// <summary>
    /// Reference is a Global Variable name
    /// </summary>
    GlobalVariable = 1
}

/// <summary>
/// Represents a timeout monitoring configuration that tracks an input source's update frequency
/// and sets an output source's value based on whether the input is being updated regularly.
/// </summary>
/// <remarks>
/// The TimeoutMemoryProcess checks the input source every second:
/// - If (CurrentTime - InputSourceTime) > Timeout: Output is set to "1" (timeout exceeded)
/// - Otherwise: Output is set to "0" (input is updating regularly)
/// Input and output sources can be either Points (MonitoringItems) or Global Variables.
/// </remarks>
[Table("timeout_memory")]
public class TimeoutMemory
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    /// <summary>
    /// Type of the input source: Point or GlobalVariable
    /// </summary>
    [Column("input_type")] 
    public TimeoutSourceType InputType { get; set; } = TimeoutSourceType.Point;
    
    /// <summary>
    /// Reference to the input source to monitor for timeout.
    /// - If InputType = Point: GUID string of the MonitoringItem
    /// - If InputType = GlobalVariable: Name of the Global Variable
    /// </summary>
    [Column("input_reference")] 
    public string InputReference { get; set; } = string.Empty;
    
    /// <summary>
    /// Type of the output source: Point or GlobalVariable
    /// </summary>
    [Column("output_type")] 
    public TimeoutSourceType OutputType { get; set; } = TimeoutSourceType.Point;
    
    /// <summary>
    /// Reference to the output source that receives the timeout status:
    /// - Value "0" = Input source is being updated regularly
    /// - Value "1" = Input source timeout exceeded
    /// - If OutputType = Point: GUID string of the MonitoringItem (must be DigitalOutput)
    /// - If OutputType = GlobalVariable: Name of the Global Variable (Boolean or Float type)
    /// </summary>
    [Column("output_reference")] 
    public string OutputReference { get; set; } = string.Empty;
    
    /// <summary>
    /// Timeout duration in seconds. If the input source is not updated within this time,
    /// the output source will be set to "1".
    /// </summary>
    [Column("timeout")] 
    public long Timeout { get; set; }
}