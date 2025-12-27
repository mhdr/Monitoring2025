using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Core.Models;

/// <summary>
/// Configuration for a Modbus TCP Server Gateway that exposes monitoring data to external clients.
/// </summary>
[Table("modbus_gateway_config")]
[Index(nameof(Port), IsUnique = true)]
public class ModbusGatewayConfig
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    /// <summary>
    /// Display name for the gateway configuration.
    /// </summary>
    [Required]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// IP address to listen on. Use "0.0.0.0" for all interfaces.
    /// </summary>
    [Column("listen_ip")]
    public string ListenIP { get; set; } = "0.0.0.0";

    /// <summary>
    /// TCP port to listen on. Must be unique across all gateways.
    /// </summary>
    [Required]
    [Column("port")]
    public int Port { get; set; }

    /// <summary>
    /// Modbus unit/slave identifier (1-247). External clients must use this ID.
    /// </summary>
    [Column("unit_id")]
    public byte UnitId { get; set; } = 1;

    /// <summary>
    /// Whether this gateway is enabled and should accept connections.
    /// </summary>
    [DefaultValue(true)]
    [Column("is_enabled")]
    public bool IsEnabled { get; set; } = true;

    /// <summary>
    /// Number of currently connected clients (updated in real-time).
    /// </summary>
    [Column("connected_clients")]
    public int ConnectedClients { get; set; } = 0;

    /// <summary>
    /// Timestamp of the last read request from any client.
    /// </summary>
    [Column("last_read_time")]
    public DateTime? LastReadTime { get; set; }

    /// <summary>
    /// Timestamp of the last write request from any client.
    /// </summary>
    [Column("last_write_time")]
    public DateTime? LastWriteTime { get; set; }

    /// <summary>
    /// Navigation property for the gateway's register mappings.
    /// </summary>
    public ICollection<ModbusGatewayMapping>? Mappings { get; set; }
}
