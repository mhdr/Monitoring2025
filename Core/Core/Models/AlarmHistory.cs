using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Core.Models;

[Table("alarm_history")]
[Index(nameof(ItemId))]
[Index(nameof(AlarmId))]
[Index(nameof(Time))]
[Index(nameof(ItemId),nameof(Time))]
public class AlarmHistory
{
    [Key, Column("id", Order = 0)]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    [Column("item_id")] public Guid ItemId { get; set; }
    [Column("alarm_id")] public Guid AlarmId { get; set; }
    [Column("is_active")] public bool IsActive { get; set; }
    [Column("alarm_log")] public string? AlarmLog { get; set; }
    [Key, Column("time", Order = 1)] public long Time { get; set; }
}