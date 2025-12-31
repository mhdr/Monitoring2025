using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

/// <summary>
/// Represents a write action memory configuration that triggers Points.WriteOrAddValue
/// with configurable execution count, simplified trigger logic, and dynamic output value support.
/// Monitors any input item (analog or digital) and writes either a static or dynamic value to the output.
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
    /// Input item ID to monitor (can be any item type - analog or digital).
    /// The action will be triggered based on the interval, regardless of the input value.
    /// </summary>
    [Column("input_item_id")]
    [Required]
    public Guid InputItemId { get; set; }

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
    /// Processing interval in seconds (how often the action executes).
    /// Default: 1 second. Must be greater than 0.
    /// </summary>
    [Column("interval")]
    [DefaultValue(1)]
    [Required]
    public int Interval { get; set; } = 1;

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
    /// Maximum number of times this action will execute.
    /// Null means continuous execution (run indefinitely).
    /// If set, must be greater than 0.
    /// Once CurrentExecutionCount reaches this value, the action stops executing.
    /// </summary>
    [Column("max_execution_count")]
    public int? MaxExecutionCount { get; set; }

    /// <summary>
    /// Current execution count - tracks how many times the action has successfully executed.
    /// Increments after each successful write operation.
    /// Default: 0. Can be reset via EditWriteActionMemory with resetExecutionCount flag.
    /// </summary>
    [Column("current_execution_count")]
    [DefaultValue(0)]
    [Required]
    public int CurrentExecutionCount { get; set; } = 0;

    /// <summary>
    /// If true, this write action memory is disabled and will not be processed.
    /// Default: false.
    /// </summary>
    [Column("is_disabled")]
    [DefaultValue(false)]
    [Required]
    public bool IsDisabled { get; set; } = false;
}
