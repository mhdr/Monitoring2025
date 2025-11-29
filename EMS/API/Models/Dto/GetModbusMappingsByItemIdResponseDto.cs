using Core.Libs;

namespace API.Models.Dto;

/// <summary>
/// Response DTO for getting Modbus mappings by item ID
/// </summary>
public class GetModbusMappingsByItemIdResponseDto
{
    /// <summary>
    /// List of Modbus mappings for the item, including controller details
    /// </summary>
    public List<ModbusMapWithController> Data { get; set; } = [];

    /// <summary>
    /// Represents a mapping between a Modbus register and a monitoring item, with controller details
    /// </summary>
    public class ModbusMapWithController
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
        /// Name of the controller
        /// </summary>
        public string ControllerName { get; set; } = string.Empty;

        /// <summary>
        /// IP address of the controller
        /// </summary>
        public string IpAddress { get; set; } = string.Empty;

        /// <summary>
        /// Port of the controller
        /// </summary>
        public int Port { get; set; }

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
