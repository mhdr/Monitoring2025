using Core.Libs;

namespace API.Models.Dto;

/// <summary>
/// Response DTO for getting Sharp7 mappings by item ID
/// </summary>
public class GetSharp7MappingsByItemIdResponseDto
{
    /// <summary>
    /// List of Sharp7 mappings for the item, including controller details
    /// </summary>
    public List<Sharp7MapWithController> Data { get; set; } = [];

    /// <summary>
    /// Represents a mapping between a Sharp7 data block position and a monitoring item, with controller details
    /// </summary>
    public class Sharp7MapWithController
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
        /// DB address of the Sharp7 controller
        /// </summary>
        public int DbAddress { get; set; }

        /// <summary>
        /// DB start data offset
        /// </summary>
        public int DbStartData { get; set; }

        /// <summary>
        /// DB data block size
        /// </summary>
        public int DbSizeData { get; set; }

        /// <summary>
        /// Data type (Bit=1, Real=2, Integer=3)
        /// </summary>
        public DataType DataType { get; set; }

        /// <summary>
        /// Position/offset within the controller's data block
        /// </summary>
        public int Position { get; set; }

        /// <summary>
        /// Bit position (0-7) for boolean/bit data types, null for other types
        /// </summary>
        public int? Bit { get; set; }

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
