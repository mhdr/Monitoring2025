using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

/// <summary>
/// Represents a write action memory configuration that triggers Points.WriteOrAddValue.
/// Simplified design: processes every cycle (duration handles timing), no execution limits, no input monitoring.
/// </summary>
[Table("write_action_memories")]
public class WriteActionMemory
{
    /// <summary>
    /// Unique identifier for this write action memory configuration.
    /// </summary>
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    /// <summary>
    /// Optional name/description for this write action memory configuration.
    /// </summary>
    [Column("name")]
    public string? Name { get; set; }

    /// <summary>
    /// Output item ID where the value will be written via WriteOrAddValue.
    /// Must be AnalogOutput or DigitalOutput.
    /// </summary>
    [Column("output_item_id")]
    [Required]
    public Guid OutputItemId { get; set; }

    /// <summary>
    /// Static output value to write (used when OutputValueSourceItemId is null).
    /// Exactly one of OutputValue or OutputValueSourceItemId must be provided.
    /// </summary>
    [Column("output_value")]
    public string? OutputValue { get; set; }

    /// <summary>
    /// Optional source item ID for dynamic output value.
    /// When set, the value from this item will be read and used as output.
    /// Exactly one of OutputValue or OutputValueSourceItemId must be provided.
    /// </summary>
    [Column("output_value_source_item_id")]
    public Guid? OutputValueSourceItemId { get; set; }

    /// <summary>
    /// Write duration in seconds for controller writes.
    /// Default: 10 seconds. Must be >= 0.
    /// 0 means instant write-and-release for supported interfaces.
    /// </summary>
    [Column("duration")]
    [DefaultValue(10)]
    [Required]
    public long Duration { get; set; } = 10;

    /// <summary>
    /// If true, this write action memory is disabled and will not be processed.
    /// Default: false.
    /// </summary>
    [Column("is_disabled")]
    [DefaultValue(false)]
    [Required]
    public bool IsDisabled { get; set; } = false;
}
