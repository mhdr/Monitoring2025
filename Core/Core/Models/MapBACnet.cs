using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Core.Libs;

namespace Core.Models;

[Table("map_bacnet")]
public class MapBACnet
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Column("controller_id")] public Guid ControllerId { get; set; }
    [Column("object_id")] public int ObjectId { get; set; }
    [Column("object_type")] public BACnetObjectType ObjectType { get; set; }

    [Column("item_id")] public Guid ItemId { get; set; }
    [Column("io_operation_type")] public IoOperationType? OperationType { get; set; }
}