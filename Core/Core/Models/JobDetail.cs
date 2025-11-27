using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Core.Models;

[Table("job_details")]
[Index(nameof(TriggerId))]
public class JobDetail
{
    [Key, Column("id")] 
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    
    [Column("trigger_id")] 
    public Guid TriggerId { get; set; }
    
    [Column("item_id")] 
    public Guid ItemId { get; set; }
    
    [Column("value")] 
    public string Value { get; set; } = string.Empty;
}