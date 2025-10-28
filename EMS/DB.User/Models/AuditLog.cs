using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Share.Libs;

namespace DB.User.Models;

[Table("audit_log")]
[Index(nameof(UserId))]
[Index(nameof(ItemId))]
[Index(nameof(Time))]
[Index(nameof(Time), nameof(ItemId))]
[Index(nameof(Time), nameof(UserId))]
[Index(nameof(Time), nameof(UserId), nameof(ItemId))]
public class AuditLog
{
    [Key, Column("id")]  // ✅ Single primary key
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Column("is_user")] public bool IsUser { get; set; }
    [Column("user_id")] public Guid? UserId { get; set; }
    [Column("item_id")] public Guid? ItemId { get; set; }
    [Column("ip_address")] public string? IpAddress { get; set; }
    [Column("action_type")] public LogType ActionType { get; set; }
    [Column("log_value")] public string? LogValue { get; set; }
    [Column("time")] public long Time { get; set; }  // ✅ Just an indexed column
}