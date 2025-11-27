using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

[Table("timeout_memory")]
public class TimeoutMemory
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Column("input_item_id")] public Guid InputItemId { get; set; }
    [Column("output_item_id")] public Guid OutputItemId { get; set; }
    [Column("timeout")] public long Timeout { get; set; }
}