using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Core.Libs;
using Microsoft.EntityFrameworkCore;

namespace Core.Models;

[Table("alarms")]
[Index(nameof(ItemId))]
public class Alarm
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Column("item_id")] public Guid ItemId { get; set; }
    [Column("alarm_type")] public AlarmType AlarmType { get; set; }
    [Column("alarm_priority")] public AlarmPriority AlarmPriority { get; set; }
    [Column("compare_type")] public CompareType CompareType { get; set; }

    [DefaultValue(false)]
    [Column("is_disabled")]
    public bool IsDisabled { get; set; } = false;
    
    [DefaultValue(false)]
    [Column("is_deleted")]
    public bool? IsDeleted { get; set; } = false;

    [Column("alarm_delay")] public int AlarmDelay { get; set; }
    [Column("message")] public string? Message { get; set; }
    [Column("message_fa")] public string? MessageFa { get; set; }
    [Column("value1")] public string? Value1 { get; set; }
    [Column("value2")] public string? Value2 { get; set; }
    [Column("timeout")] public int? Timeout { get; set; }
    
    [DefaultValue(false)]
    [Column("has_external_alarm")]
    public bool? HasExternalAlarm { get; set; }

    public Alarm()
    {
        AlarmType = AlarmType.Comparative;
        AlarmPriority = AlarmPriority.Alarm;
        CompareType = CompareType.Equal;
        IsDisabled = false;
        AlarmDelay = 0;
        Message = "";
        MessageFa="";
        Value1 = "";
        Value2 = "";
        Timeout = 0;
    }
}