using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Core.Models;

[Table("dictionary")]
public class Dictionary
{
    [Key, Column("key")] 
    public string Key { get; set; } = string.Empty;
    public string? Value { get; set; }
}