using Core.Libs;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for batch editing Modbus gateway mappings
/// </summary>
public class BatchEditModbusGatewayMappingsRequestDto
{
    /// <summary>
    /// The gateway ID to edit mappings for
    /// </summary>
    public Guid GatewayId { get; set; }

    /// <summary>
    /// Mappings to add
    /// </summary>
    public List<ModbusGatewayMappingEditDto> Added { get; set; } = [];

    /// <summary>
    /// Mappings to update (existing mappings with modified values)
    /// </summary>
    public List<ModbusGatewayMappingEditDto> Updated { get; set; } = [];

    /// <summary>
    /// IDs of mappings to remove
    /// </summary>
    public List<Guid> RemovedIds { get; set; } = [];
}

/// <summary>
/// DTO for creating or updating a gateway mapping
/// </summary>
public class ModbusGatewayMappingEditDto
{
    /// <summary>
    /// Mapping ID (required for updates, ignored for adds)
    /// </summary>
    public Guid? Id { get; set; }

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
    /// Data representation format (Int16=1, Float32=2, ScaledInteger=3)
    /// </summary>
    public int DataRepresentation { get; set; } = 2; // Default to Float32

    /// <summary>
    /// Byte/word ordering (None=0, BigEndian=1, LittleEndian=2, MidBigEndian=3, MidLittleEndian=4)
    /// </summary>
    public int Endianness { get; set; } = 1; // Default to BigEndian

    /// <summary>
    /// Minimum scale value for ScaledInteger representation
    /// </summary>
    public float? ScaleMin { get; set; }

    /// <summary>
    /// Maximum scale value for ScaledInteger representation
    /// </summary>
    public float? ScaleMax { get; set; }
}
