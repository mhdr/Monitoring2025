using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Core.Models;

[Table("raw_items")]
public class RawItem
{
    [Key, Column("id")] 
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    [Column("item_id")] public Guid ItemId { get; set; }

    [Column("value")] public string Value { get; set; } = string.Empty;
    [Column("time")] public long Time { get; set; }
}