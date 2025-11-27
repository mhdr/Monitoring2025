using Core.Libs;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for batch editing Modbus mappings
/// </summary>
public class BatchEditModbusMapsRequestDto
{
    /// <summary>
    /// ID of the controller to update mappings for
    /// </summary>
    public Guid ControllerId { get; set; }

    /// <summary>
    /// List of existing mappings that have been modified
    /// </summary>
    public List<ModbusMapItem> Changed { get; set; } = [];

    /// <summary>
    /// List of new mappings to be added
    /// </summary>
    public List<ModbusMapItem> Added { get; set; } = [];

    /// <summary>
    /// List of mapping IDs to be removed
    /// </summary>
    public List<Guid> Removed { get; set; } = [];

    /// <summary>
    /// Represents a Modbus mapping item for create/update operations
    /// </summary>
    public class ModbusMapItem
    {
        /// <summary>
        /// Unique identifier for the mapping (for updates only)
        /// </summary>
        public Guid? Id { get; set; }

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
        public int? OperationType { get; set; }
    }
}
