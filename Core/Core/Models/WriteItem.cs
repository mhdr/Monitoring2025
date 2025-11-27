using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Core.Models;

/// <summary>
/// Represents a recorded write operation for a monitored item.
/// Stored in the "write_items" table and indexed uniquely by ItemId.
/// </summary>
[Table("write_items")]
[Index(nameof(ItemId), IsUnique = true)]
public class WriteItem
{
    /// <summary>
    /// Primary key (database-generated identity).
    /// </summary>
    [Key, Column("id")] 
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    /// <summary>
    /// Identifier of the monitored item this write belongs to.
    /// Indexed uniquely to ensure one write record per item in the table.
    /// </summary>
    [Column("item_id")] public Guid ItemId { get; set; }

    /// <summary>
    /// The value written to the item (stored as string).
    /// Consider constraints/validation if values can be large or require structure.
    /// </summary>
    [Column("value")] public string Value { get; set; } = string.Empty;

    /// <summary>
    /// Unix epoch timestamp (seconds or milliseconds as used by the system) when the write occurred.
    /// Stored as a long; ensure callers use the same epoch unit.
    /// </summary>
    [Column("time")] public long Time { get; set; }
    
    /// <summary>
    /// Duration of the write operation in seconds.
    /// A value of 0 indicates an infinite write duration (no expiration).
    /// Defaults to 10 seconds when not specified.
    /// Use this for retention/TTL or reporting of write durations.
    /// </summary>
    [Column("duration_s")] public long DurationSeconds { get; set; } = 10;
}