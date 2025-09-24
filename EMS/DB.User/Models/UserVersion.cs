using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace DB.User.Models;


[Table("users_version")]
[Index(nameof(UserId))]
public class UserVersion
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    
    [Column("user_id")] public Guid UserId { get; set; }
    
    [Column("version")] public string? Version { get; set; }
}