namespace API.Models.Dto;

/// <summary>
/// Represents a validation error for gateway configuration
/// </summary>
public class GatewayValidationError
{
    /// <summary>
    /// The field that failed validation
    /// </summary>
    public string Field { get; set; } = string.Empty;

    /// <summary>
    /// The error code for programmatic handling
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable error message
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Creates a port conflict validation error
    /// </summary>
    public static GatewayValidationError PortConflictInDb(int port) => new()
    {
        Field = "Port",
        Code = "PORT_CONFLICT_DB",
        Message = $"Port {port} is already in use by another gateway"
    };

    /// <summary>
    /// Creates a port in use on system validation error
    /// </summary>
    public static GatewayValidationError PortInUseOnSystem(int port) => new()
    {
        Field = "Port",
        Code = "PORT_IN_USE_SYSTEM",
        Message = $"Port {port} is already in use by another application on the system"
    };

    /// <summary>
    /// Creates a mapping address overlap validation error
    /// </summary>
    public static GatewayValidationError MappingOverlap(int address, int registerCount, string registerType) => new()
    {
        Field = "ModbusAddress",
        Code = "MAPPING_OVERLAP",
        Message = $"Address range {address}-{address + registerCount - 1} overlaps with another mapping in {registerType}"
    };
}
