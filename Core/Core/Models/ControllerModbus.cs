using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Core.Libs;

namespace Core.Models;

[Table("controller_modbus")]
public class ControllerModbus
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Column("name")] public string Name { get; set; } = string.Empty;
    [Column("ip_address")] public string IPAddress { get; set; } = string.Empty;
    [Column("port")] public int Port { get; set; }
    [Column("start_address")] public int StartAddress { get; set; }
    [Column("data_length")] public int DataLength { get; set; }
    [Column("modbus_datatype")] public ModbusDataType DataType { get; set; }
    [Column("endianness")] public Endianness? Endianness { get; set; } = Libs.Endianness.None;
    [Column("connection_type")] public ModbusConnectionType? ConnectionType { get; set; } = ModbusConnectionType.TCP;
    [Column("modbus_type")] public MyModbusType? ModbusType { get; set; } = MyModbusType.None;
    
    /// <summary>
    /// Modbus unit/slave identifier (0-247). 
    /// For TCP-only devices, use 0 or 255 (0xFF).
    /// For RTU over TCP, use the actual slave address (1-247).
    /// </summary>
    [Column("unit_identifier")] public byte? UnitIdentifier { get; set; } = 1;
    
    /// <summary>
    /// Address base convention for register addresses.
    /// Base0: direct protocol address (enter 3027 for register 3027)
    /// Base1: 1-based (enter 3028 for register 3027)
    /// Base40001: Modbus standard (enter 43028 for register 3027)
    /// Base40000: Alternative (enter 43027 for register 3027)
    /// </summary>
    [Column("address_base")] public ModbusAddressBase? AddressBase { get; set; } = ModbusAddressBase.Base0;

    [DefaultValue(false)]
    [Column("is_disabled")] public bool? IsDisabled { get; set; } = false;
}