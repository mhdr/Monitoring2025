using Core.Libs;

namespace API.Models.Dto;

/// <summary>
/// Response DTO for getting Modbus gateway mappings
/// </summary>
public class GetModbusGatewayMappingsResponseDto
{
    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// Error message if the operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// List of mappings for the gateway
    /// </summary>
    public List<ModbusGatewayMappingDto> Mappings { get; set; } = [];
}

/// <summary>
/// DTO representing a single gateway mapping
/// </summary>
public class ModbusGatewayMappingDto
{
    /// <summary>
    /// Unique identifier for the mapping
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Parent gateway ID
    /// </summary>
    public Guid GatewayId { get; set; }

    /// <summary>
    /// Starting Modbus register address (0-based)
    /// </summary>
    public int ModbusAddress { get; set; }

    /// <summary>
    /// Type of Modbus register (Coil=1, DiscreteInput=2, HoldingRegister=3, InputRegister=4)
    /// </summary>
    public int RegisterType { get; set; }

    /// <summary>
    /// Monitoring item ID being exposed
    /// </summary>
    public Guid ItemId { get; set; }

    /// <summary>
    /// Monitoring item name (for display)
    /// </summary>
    public string? ItemName { get; set; }

    /// <summary>
    /// Monitoring item Persian name (for display)
    /// </summary>
    public string? ItemNameFa { get; set; }

    /// <summary>
    /// Whether the item is editable (for write operations)
    /// </summary>
    public bool IsEditable { get; set; }

    /// <summary>
    /// Number of registers used by this mapping
    /// </summary>
    public int RegisterCount { get; set; }

    /// <summary>
    /// Data representation format (Int16=1, Float32=2, ScaledInteger=3)
    /// </summary>
    public int DataRepresentation { get; set; }

    /// <summary>
    /// Byte/word ordering (None=0, BigEndian=1, LittleEndian=2, MidBigEndian=3, MidLittleEndian=4)
    /// </summary>
    public int Endianness { get; set; }

    /// <summary>
    /// Minimum scale value for ScaledInteger
    /// </summary>
    public float? ScaleMin { get; set; }

    /// <summary>
    /// Maximum scale value for ScaledInteger
    /// </summary>
    public float? ScaleMax { get; set; }
}
