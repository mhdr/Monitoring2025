using Core.Libs;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for editing an existing Modbus controller
/// </summary>
public class EditModbusControllerRequestDto
{
    /// <summary>
    /// Unique identifier of the controller to edit
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Display name of the controller
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// IP address for Modbus TCP connection
    /// </summary>
    public string IPAddress { get; set; } = string.Empty;

    /// <summary>
    /// Port number for Modbus TCP connection (default: 502)
    /// </summary>
    public int Port { get; set; } = 502;

    /// <summary>
    /// Starting register address for reading data
    /// </summary>
    public int StartAddress { get; set; }

    /// <summary>
    /// Number of registers to read from the start address
    /// </summary>
    public int DataLength { get; set; }

    /// <summary>
    /// Data type for register interpretation (Boolean=1, Int=2, Float=3)
    /// </summary>
    public int DataType { get; set; }

    /// <summary>
    /// Byte order for multi-byte values (None=0, BigEndian=1, LittleEndian=2, MidBigEndian=3, MidLittleEndian=4)
    /// </summary>
    public int? Endianness { get; set; }

    /// <summary>
    /// Connection type (TCP=1 or TcpoverRTU=2)
    /// </summary>
    public int? ConnectionType { get; set; }

    /// <summary>
    /// Modbus protocol type (None=0, ASCII=1, RTU=2)
    /// </summary>
    public int? ModbusType { get; set; }

    /// <summary>
    /// Modbus unit/slave identifier (0-247)
    /// </summary>
    public byte? UnitIdentifier { get; set; }

    /// <summary>
    /// Address base convention (Base0=0, Base1=1, Base40001=2, Base40000=3)
    /// </summary>
    public int? AddressBase { get; set; }

    /// <summary>
    /// Whether the controller is disabled
    /// </summary>
    public bool IsDisabled { get; set; } = false;
}
