using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

/// <summary>
/// Holiday calendar for schedule exception handling
/// Reusable across multiple schedule memories for centralized holiday management
/// </summary>
[Table("holiday_calendar")]
public class HolidayCalendar
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    
    /// <summary>
    /// Human-readable name for the calendar (e.g., "US Federal Holidays", "Company Holidays 2025")
    /// </summary>
    [Required]
    [Column("name")]
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Optional description of the calendar
    /// </summary>
    [Column("description")]
    public string? Description { get; set; }
    
    /// <summary>
    /// Navigation property for holiday dates
    /// </summary>
    public virtual ICollection<HolidayDate>? Dates { get; set; }
}
