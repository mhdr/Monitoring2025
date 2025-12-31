using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

/// <summary>
/// Override expiration mode for manual override behavior
/// </summary>
public enum OverrideExpirationMode
{
    /// <summary>
    /// Override expires after a specified duration in minutes
    /// </summary>
    TimeBased = 1,
    
    /// <summary>
    /// Override remains active until the next schedule change or manual deactivation
    /// </summary>
    EventBased = 2
}

/// <summary>
/// Priority levels for schedule blocks to resolve conflicts
/// Higher priority blocks take precedence when schedules overlap
/// </summary>
public enum SchedulePriority
{
    /// <summary>
    /// Low priority - can be overridden by any higher priority
    /// </summary>
    Low = 1,
    
    /// <summary>
    /// Normal priority - default for most schedules
    /// </summary>
    Normal = 2,
    
    /// <summary>
    /// High priority - takes precedence over normal schedules
    /// </summary>
    High = 3,
    
    /// <summary>
    /// Critical priority - highest precedence, for emergency or demand response
    /// </summary>
    Critical = 4
}

/// <summary>
/// Schedule Memory for generating setpoints or outputs based on time schedules
/// Use cases: Temperature setpoints (day/night, weekday/weekend), equipment start/stop schedules,
/// demand response programs, lighting control, HVAC optimization
/// </summary>
[Table("schedule_memory")]
public class ScheduleMemory
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    
    /// <summary>
    /// Human-readable name for the schedule
    /// </summary>
    [Column("name")]
    public string? Name { get; set; }

    /// <summary>
    /// Output monitoring item ID where scheduled value is written
    /// Must be AnalogOutput (for setpoints) or DigitalOutput (for on/off commands)
    /// </summary>
    [Column("output_item_id")]
    public Guid OutputItemId { get; set; }

    /// <summary>
    /// Processing interval in seconds for schedule evaluation
    /// </summary>
    [DefaultValue(10)]
    [Column("interval")]
    public int Interval { get; set; } = 10;

    /// <summary>
    /// Enable/disable flag for schedule processing
    /// </summary>
    [DefaultValue(false)]
    [Column("is_disabled")]
    public bool IsDisabled { get; set; } = false;

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
    /// Optional reference to a holiday calendar for exception handling
    /// When today is a holiday, schedule blocks are skipped
    /// </summary>
    [Column("holiday_calendar_id")]
    public Guid? HolidayCalendarId { get; set; }
    
    /// <summary>
    /// Navigation property for holiday calendar
    /// </summary>
    [ForeignKey("HolidayCalendarId")]
    public virtual HolidayCalendar? HolidayCalendar { get; set; }
    
    /// <summary>
    /// Default analog output value when no schedule block is active (for AnalogOutput items)
    /// </summary>
    [Column("default_analog_value")]
    public double? DefaultAnalogValue { get; set; }
    
    /// <summary>
    /// Default digital output value when no schedule block is active (for DigitalOutput items)
    /// </summary>
    [Column("default_digital_value")]
    public bool? DefaultDigitalValue { get; set; }
    
    /// <summary>
    /// Whether manual override is currently active
    /// </summary>
    [DefaultValue(false)]
    [Column("manual_override_active")]
    public bool ManualOverrideActive { get; set; } = false;
    
    /// <summary>
    /// Analog value to use during manual override (for AnalogOutput items)
    /// </summary>
    [Column("manual_override_analog_value")]
    public double? ManualOverrideAnalogValue { get; set; }
    
    /// <summary>
    /// Digital value to use during manual override (for DigitalOutput items)
    /// </summary>
    [Column("manual_override_digital_value")]
    public bool? ManualOverrideDigitalValue { get; set; }
    
    /// <summary>
    /// Mode for override expiration behavior
    /// </summary>
    [DefaultValue(OverrideExpirationMode.TimeBased)]
    [Column("override_expiration_mode")]
    public OverrideExpirationMode OverrideExpirationMode { get; set; } = OverrideExpirationMode.TimeBased;
    
    /// <summary>
    /// Duration in minutes for time-based override expiration
    /// </summary>
    [DefaultValue(60)]
    [Column("override_duration_minutes")]
    public int OverrideDurationMinutes { get; set; } = 60;
    
    /// <summary>
    /// Timestamp when manual override was activated (for time-based expiration calculation)
    /// </summary>
    [Column("override_activation_time")]
    public DateTime? OverrideActivationTime { get; set; }
    
    /// <summary>
    /// Last active schedule block ID (for event-based override expiration detection)
    /// </summary>
    [Column("last_active_block_id")]
    public Guid? LastActiveBlockId { get; set; }
    
    /// <summary>
    /// Navigation property for schedule blocks (weekly time schedules)
    /// </summary>
    public virtual ICollection<ScheduleBlock>? ScheduleBlocks { get; set; }
}
