using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Core.Libs;

namespace Core.Models;

[Table("map_sharp7")]
public class MapSharp7
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Column("controller_id")] public Guid ControllerId { get; set; }
    [Column("position")] public int Position { get; set; }
    [Column("bit")] public int? Bit { get; set; }
    [Column("item_id")] public Guid ItemId { get; set; }
    [Column("io_operation_type")] public IoOperationType? OperationType { get; set; }
}