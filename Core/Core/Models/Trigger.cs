using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

[Table("triggers")]
public class Trigger
{
    [Key, Column("id")] 
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    [Column("name")] public string Name { get; set; } = string.Empty;
    [Column("start_time")] public string StartTime { get; set; } = string.Empty;
    [Column("end_time")] public string EndTime { get; set; } = string.Empty;
    [Column("is_disabled")] public bool IsDisabled { get; set; }
}