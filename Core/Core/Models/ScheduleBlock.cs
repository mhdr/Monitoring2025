using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

/// <summary>
/// Days of the week for schedule block configuration
/// </summary>
public enum ScheduleDayOfWeek
{
    Sunday = 0,
    Monday = 1,
    Tuesday = 2,
    Wednesday = 3,
    Thursday = 4,
    Friday = 5,
    Saturday = 6
}

/// <summary>
/// Behavior for schedule blocks when EndTime is null
/// Determines how blocks without explicit end times should behave
/// </summary>
public enum NullEndTimeBehavior
{
    /// <summary>
    /// Use memory's default value immediately (block activates then defaults)
    /// Useful for momentary activation or when user wants manual control of deactivation
    /// </summary>
    UseDefault = 1,
    
    /// <summary>
    /// Extend block to end of day (23:59:59.999)
    /// Keeps the block active until midnight, then reevaluates schedule
    /// </summary>
    ExtendToEndOfDay = 2
}

/// <summary>
/// A time block within a schedule that defines when a specific output value should be active
/// Supports both analog setpoints and digital commands
/// </summary>
[Table("schedule_block")]
public class ScheduleBlock
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    
    /// <summary>
    /// Foreign key to parent schedule memory
    /// </summary>
    [Column("schedule_memory_id")]
    public Guid ScheduleMemoryId { get; set; }
    
    /// <summary>
    /// Navigation property to parent schedule memory
    /// </summary>
    [ForeignKey("ScheduleMemoryId")]
    public virtual ScheduleMemory? ScheduleMemory { get; set; }
    
    /// <summary>
    /// Day of week this block applies to
    /// </summary>
    [Column("day_of_week")]
    public ScheduleDayOfWeek DayOfWeek { get; set; }
    
    /// <summary>
    /// Start time of the schedule block (time of day)
    /// Stored as PostgreSQL interval type
    /// </summary>
    [Column("start_time", TypeName = "interval")]
    public TimeSpan StartTime { get; set; }
    
    /// <summary>
    /// End time of the schedule block (time of day)
    /// Stored as PostgreSQL interval type
    /// Can be null for blocks without explicit end time (behavior controlled by NullEndTimeBehavior)
    /// Can be less than StartTime for cross-midnight blocks (e.g., 22:00 to 02:00)
    /// </summary>
    [Column("end_time", TypeName = "interval")]
    public TimeSpan? EndTime { get; set; }
    
    /// <summary>
    /// Priority level for conflict resolution
    /// Higher priority blocks take precedence when times overlap
    /// </summary>
    [DefaultValue(SchedulePriority.Normal)]
    [Column("priority")]
    public SchedulePriority Priority { get; set; } = SchedulePriority.Normal;
    
    /// <summary>
    /// Behavior when EndTime is null - determines if block extends to end of day or uses default value
    /// </summary>
    [DefaultValue(NullEndTimeBehavior.ExtendToEndOfDay)]
    [Column("null_end_time_behavior")]
    public NullEndTimeBehavior NullEndTimeBehavior { get; set; } = NullEndTimeBehavior.ExtendToEndOfDay;
    
    /// <summary>
    /// Analog output value for this time block (used when output item is AnalogOutput)
    /// Mutually exclusive with DigitalOutputValue - exactly one must be set
    /// </summary>
    [Column("analog_output_value")]
    public double? AnalogOutputValue { get; set; }
    
    /// <summary>
    /// Digital output value for this time block (used when output item is DigitalOutput)
    /// Mutually exclusive with AnalogOutputValue - exactly one must be set
    /// </summary>
    [Column("digital_output_value")]
    public bool? DigitalOutputValue { get; set; }
    
    /// <summary>
    /// Optional description or label for this block (e.g., "Morning warmup", "Night setback")
    /// </summary>
    [Column("description")]
    public string? Description { get; set; }
}
