using Core.Libs;

namespace API.Models.Dto;

/// <summary>
/// Response DTO for getting Modbus mappings
/// </summary>
public class GetModbusMapsResponseDto
{
    /// <summary>
    /// List of Modbus mappings for the controller
    /// </summary>
    public List<ModbusMap> Data { get; set; } = [];

    /// <summary>
    /// Represents a mapping between a Modbus register and a monitoring item
    /// </summary>
    public class ModbusMap
    {
        /// <summary>
        /// Unique identifier for the mapping
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// ID of the controller this mapping belongs to
        /// </summary>
        public Guid ControllerId { get; set; }

        /// <summary>
        /// Position/offset within the controller's data block
        /// </summary>
        public int Position { get; set; }

        /// <summary>
        /// ID of the monitoring item mapped to this position
        /// </summary>
        public Guid ItemId { get; set; }

        /// <summary>
        /// Operation type (Read=1 or Write=2)
        /// </summary>
        public IoOperationType? OperationType { get; set; }
    }
}
