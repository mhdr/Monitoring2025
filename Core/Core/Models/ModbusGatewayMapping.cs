using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Core.Libs;
using Microsoft.EntityFrameworkCore;

namespace Core.Models;

/// <summary>
/// Maps a Modbus register address to a monitoring item for the gateway.
/// </summary>
[Table("modbus_gateway_mapping")]
[Index(nameof(GatewayId))]
[Index(nameof(GatewayId), nameof(RegisterType), nameof(ModbusAddress))]
public class ModbusGatewayMapping
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    /// <summary>
    /// Foreign key to the parent gateway configuration.
    /// </summary>
    [Required]
    [Column("gateway_id")]
    public Guid GatewayId { get; set; }

    /// <summary>
    /// Navigation property to the parent gateway.
    /// </summary>
    [ForeignKey(nameof(GatewayId))]
    public ModbusGatewayConfig? Gateway { get; set; }

    /// <summary>
    /// Starting Modbus register address (0-based).
    /// </summary>
    [Required]
    [Column("modbus_address")]
    public int ModbusAddress { get; set; }

    /// <summary>
    /// Type of Modbus register (Coil, DiscreteInput, HoldingRegister, InputRegister).
    /// </summary>
    [Required]
    [Column("register_type")]
    public ModbusRegisterType RegisterType { get; set; }

    /// <summary>
    /// Foreign key to the monitoring item being exposed.
    /// </summary>
    [Required]
    [Column("item_id")]
    public Guid ItemId { get; set; }

    /// <summary>
    /// Navigation property to the monitoring item.
    /// </summary>
    [ForeignKey(nameof(ItemId))]
    public MonitoringItem? Item { get; set; }

    /// <summary>
    /// Number of registers used by this mapping.
    /// Calculated based on DataRepresentation: Int16=1, Float32=2, ScaledInteger=1.
    /// </summary>
    [Column("register_count")]
    public int RegisterCount { get; set; } = 1;

    /// <summary>
    /// Data representation format for the register value.
    /// </summary>
    [DefaultValue(ModbusDataRepresentation.Float32)]
    [Column("data_representation")]
    public ModbusDataRepresentation DataRepresentation { get; set; } = ModbusDataRepresentation.Float32;

    /// <summary>
    /// Byte/word ordering for multi-register values (Float32).
    /// </summary>
    [DefaultValue(Endianness.BigEndian)]
    [Column("endianness")]
    public Endianness Endianness { get; set; } = Endianness.BigEndian;

    /// <summary>
    /// Minimum scale value for ScaledInteger representation.
    /// Maps to 0 in the 0-65535 range.
    /// </summary>
    [Column("scale_min")]
    public float? ScaleMin { get; set; }

    /// <summary>
    /// Maximum scale value for ScaledInteger representation.
    /// Maps to 65535 in the 0-65535 range.
    /// </summary>
    [Column("scale_max")]
    public float? ScaleMax { get; set; }
}
