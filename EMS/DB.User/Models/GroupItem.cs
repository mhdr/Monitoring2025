using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DB.User.Models;

[Table("group_items")]
public class GroupItem
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Column("group_id")] public Guid GroupId { get; set; }
    [Column("item_id")] public Guid ItemId { get; set; }
}