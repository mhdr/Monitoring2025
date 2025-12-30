using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

/// <summary>
/// Individual holiday date within a holiday calendar
/// When today matches a holiday date, associated schedule blocks are skipped
/// </summary>
[Table("holiday_date")]
public class HolidayDate
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    
    /// <summary>
    /// Foreign key to parent holiday calendar
    /// </summary>
    [Column("holiday_calendar_id")]
    public Guid HolidayCalendarId { get; set; }
    
    /// <summary>
    /// Navigation property to parent holiday calendar
    /// </summary>
    [ForeignKey("HolidayCalendarId")]
    public virtual HolidayCalendar? HolidayCalendar { get; set; }
    
    /// <summary>
    /// The holiday date (only date portion is used, time is ignored)
    /// Stored as PostgreSQL date type
    /// </summary>
    [Column("date", TypeName = "date")]
    public DateTime Date { get; set; }
    
    /// <summary>
    /// Human-readable name of the holiday (e.g., "Christmas", "New Year's Day")
    /// </summary>
    [Column("name")]
    public string? Name { get; set; }
    
    /// <summary>
    /// Optional analog value to use on this holiday (overrides default behavior)
    /// If null, the schedule's default value is used when this holiday is active
    /// </summary>
    [Column("holiday_analog_value")]
    public double? HolidayAnalogValue { get; set; }
    
    /// <summary>
    /// Optional digital value to use on this holiday (overrides default behavior)
    /// If null, the schedule's default value is used when this holiday is active
    /// </summary>
    [Column("holiday_digital_value")]
    public bool? HolidayDigitalValue { get; set; }
}
