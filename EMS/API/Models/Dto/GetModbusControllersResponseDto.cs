using Core.Libs;

namespace API.Models.Dto;

/// <summary>
/// Response DTO for getting all Modbus controllers in the system
/// </summary>
public class GetModbusControllersResponseDto
{
    /// <summary>
    /// List of Modbus controller configurations
    /// </summary>
    public List<ModbusController> Data { get; set; } = [];

    /// <summary>
    /// Represents a Modbus controller configuration
    /// </summary>
    public class ModbusController
    {
        /// <summary>
        /// Unique identifier for the controller
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
        public int Port { get; set; }

        /// <summary>
        /// Starting register address for reading data
        /// </summary>
        public int StartAddress { get; set; }

        /// <summary>
        /// Number of registers to read from the start address
        /// </summary>
        public int DataLength { get; set; }

        /// <summary>
        /// Data type for register interpretation (Boolean, Int, Float)
        /// </summary>
        public ModbusDataType DataType { get; set; }

        /// <summary>
        /// Byte order for multi-byte values (BigEndian, LittleEndian, etc.)
        /// </summary>
        public Endianness? Endianness { get; set; }

        /// <summary>
        /// Connection type (TCP or TCP over RTU)
        /// </summary>
        public ModbusConnectionType? ConnectionType { get; set; }

        /// <summary>
        /// Modbus protocol type (None, ASCII, RTU)
        /// </summary>
        public MyModbusType? ModbusType { get; set; }

        /// <summary>
        /// Modbus unit/slave identifier (0-247)
        /// </summary>
        public byte? UnitIdentifier { get; set; }

        /// <summary>
        /// Address base convention for register addresses
        /// </summary>
        public ModbusAddressBase? AddressBase { get; set; }

        /// <summary>
        /// Whether the controller is disabled
        /// </summary>
        public bool IsDisabled { get; set; }
    }
}
