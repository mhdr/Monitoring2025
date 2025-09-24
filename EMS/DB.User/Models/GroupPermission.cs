using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace DB.User.Models;

[Table("group_permissions")]
[Index(nameof(UserId))]
[Index(nameof(GroupId))]
[Index(nameof(UserId),nameof(GroupId))]
public class GroupPermission
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    
    [Column("user_id")] public Guid UserId { get; set; }
    [Column("group_id")] public Guid GroupId { get; set; }
}