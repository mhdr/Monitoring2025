using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace DB.User.Models;


[Table("item_permissions")]
[Index(nameof(UserId))]
[Index(nameof(ItemId))]
[Index(nameof(UserId),nameof(ItemId))]
public class ItemPermission
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    
    [Column("user_id")] public Guid UserId { get; set; }
    [Column("item_id")] public Guid ItemId { get; set; }
}