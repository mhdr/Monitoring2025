using Core.Libs;

namespace API.Models.Dto;

/// <summary>
/// Response DTO for getting all Modbus gateway configurations
/// </summary>
public class GetModbusGatewaysResponseDto
{
    /// <summary>
    /// List of Modbus gateway configurations with status
    /// </summary>
    public List<ModbusGateway> Data { get; set; } = [];

    /// <summary>
    /// Represents a Modbus gateway configuration with status
    /// </summary>
    public class ModbusGateway
    {
        /// <summary>
        /// Unique identifier for the gateway
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Display name of the gateway
        /// </summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// IP address to listen on (e.g., "0.0.0.0" for all interfaces)
        /// </summary>
        public string ListenIP { get; set; } = "0.0.0.0";

        /// <summary>
        /// TCP port to listen on
        /// </summary>
        public int Port { get; set; }

        /// <summary>
        /// Modbus unit/slave identifier (1-247)
        /// </summary>
        public byte UnitId { get; set; }

        /// <summary>
        /// Whether the gateway is enabled
        /// </summary>
        public bool IsEnabled { get; set; }

        /// <summary>
        /// Number of currently connected clients
        /// </summary>
        public int ConnectedClients { get; set; }

        /// <summary>
        /// Timestamp of the last read request from any client
        /// </summary>
        public DateTime? LastReadTime { get; set; }

        /// <summary>
        /// Timestamp of the last write request from any client
        /// </summary>
        public DateTime? LastWriteTime { get; set; }

        /// <summary>
        /// Number of mappings configured for this gateway
        /// </summary>
        public int MappingCount { get; set; }
    }
}
