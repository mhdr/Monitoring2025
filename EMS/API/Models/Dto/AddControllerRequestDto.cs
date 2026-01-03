namespace API.Models.Dto;

/// <summary>
/// Request DTO for adding a new controller to the monitoring system
/// </summary>
public class AddControllerRequestDto
{
    /// <summary>
    /// Display name of the controller
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// IP address of the controller for network communication
    /// </summary>
    public required string IPAddress { get; set; }

    /// <summary>
    /// Database address or ID for controller identification
    /// </summary>
    public int DBAddress { get; set; }

    /// <summary>
    /// Starting address in the controller's data block
    /// </summary>
    public int DBStartData { get; set; }

    /// <summary>
    /// Size of the data block to read from the controller
    /// </summary>
    public int DBSizeData { get; set; }

    /// <summary>
    /// Type of data format used by the controller
    /// </summary>
    public int DataType { get; set; }

    /// <summary>
    /// Controller type identifier (PLC brand, model, etc.)
    /// </summary>
    public int ControllerType { get; set; }
}