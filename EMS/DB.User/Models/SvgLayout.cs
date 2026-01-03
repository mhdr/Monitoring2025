using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DB.User.Models;

[Table("svg_layout")]
public class SvgLayout
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    
    [Column("name")] 
    public string? Name { get; set; }
    
    [Column("content")] 
    public required string Content { get; set; }
    
    [Column("font_size")] 
    public required string FontSize { get; set; }
    
    [Column("is_disabled")] 
    public bool IsDisabled { get; set; }
    
    [Column("order")]
    public int Order { get; set; }
}