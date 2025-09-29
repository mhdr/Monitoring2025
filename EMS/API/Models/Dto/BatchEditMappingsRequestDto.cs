using Share.Libs;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for batch editing I/O mappings between controllers and monitoring points
/// </summary>
public class BatchEditMappingsRequestDto
{
    /// <summary>
    /// ID of the controller to update mappings for
    /// </summary>
    public Guid ControllerId { get; set; }

    /// <summary>
    /// Type of I/O operation (Input/Output/Both)
    /// </summary>
    public IoOperationType OperationType { get; set; }

    /// <summary>
    /// List of existing mappings that have been modified
    /// </summary>
    public List<Map> Changed { get; set; } = [];

    /// <summary>
    /// List of new mappings to be added
    /// </summary>
    public List<Map> Added { get; set; } = [];

    /// <summary>
    /// List of mappings to be removed
    /// </summary>
    public List<Map> Removed { get; set; } = [];

    /// <summary>
    /// Represents a single I/O mapping between controller and monitoring point
    /// </summary>
    public class Map
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
        /// Position/address in the controller data block
        /// </summary>
        public int Position { get; set; }

        /// <summary>
        /// Optional bit position for digital points within a word/byte
        /// </summary>
        public int? Bit { get; set; }

        /// <summary>
        /// ID of the monitoring item mapped to this controller position
        /// </summary>
        public Guid ItemId { get; set; }
    }
}