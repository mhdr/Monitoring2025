using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Core.Models;

[Table("external_alarms")]
[Index(nameof(AlarmId))]
public class ExternalAlarm
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Column("alarm_id")] public Guid AlarmId { get; set; }

    [Column("item_id")] public Guid ItemId { get; set; }

    [Column("value")] public bool Value { get; set; }

    [DefaultValue(false)]
    [Column("is_disabled")]
    public bool IsDisabled { get; set; }
}