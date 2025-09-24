using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DB.User.Models;

[Table("groups")]
public class Group
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Column("name")] public string Name { get; set; }
    
    [Column("parent_id")]
    public Guid? ParentId { get; set; }
}