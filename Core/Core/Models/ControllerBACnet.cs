using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Models;

[Table("controller_bacnet")]
public class ControllerBACnet
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }
    
    [Column("name")] public string Name { get; set; } = string.Empty;
    
    [Column("device_id")] public int DeviceId { get; set; }
    
    [DefaultValue(false)]
    [Column("is_disabled")] public bool? IsDisabled { get; set; } = false;
}