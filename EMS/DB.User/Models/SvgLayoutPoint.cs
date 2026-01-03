using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace DB.User.Models;

[Table("svg_layout_points")]
[Index(nameof(SvgLayoutId))]
public class SvgLayoutPoint
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    
    [Column("svg_layout_id")] public Guid SvgLayoutId { get; set; }
    
    [Column("item_id")] public Guid ItemId { get; set; }
    [Column("x")] public int X { get; set; }
    [Column("y")] public int Y { get; set; }
    
    [Column("box_color")]
    public required string BoxColor { get; set; }
    
    [Column("box_opacity")]
    public double BoxOpacity { get; set; }
}