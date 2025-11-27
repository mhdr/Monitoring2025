using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Core.Models;

[Table("active_alarms")]
[Index(nameof(ItemId))]
[Index(nameof(AlarmId))]
[Index(nameof(ItemId),nameof(AlarmId))]
public class ActiveAlarm
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    [Column("item_id")] public Guid ItemId { get; set; }

    [Column("alarm_id")] public Guid AlarmId { get; set; }
    [Column("time")] public long Time { get; set; }
}