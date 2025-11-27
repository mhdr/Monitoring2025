using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Core.Models;

[Table("items_history")]
[Index(nameof(ItemId))]
[Index(nameof(Time))]
[Index(nameof(ItemId),nameof(Time))]
public class ItemHistory
{
    [Key, Column("id", Order = 0)]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Column("item_id")] public Guid ItemId { get; set; }
    [Column("value")] public string Value { get; set; } = string.Empty;
    [Key, Column("time", Order = 1)] public long Time { get; set; }
}