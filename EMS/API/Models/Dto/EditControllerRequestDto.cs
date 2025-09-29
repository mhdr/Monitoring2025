namespace API.Models.Dto;

/// <summary>
/// Request DTO for editing an existing controller configuration
/// </summary>
public class EditControllerRequestDto
{
    /// <summary>
    /// Unique identifier of the controller to edit
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Display name of the controller
    /// </summary>
    public string Name { get; set; }

    /// <summary>
    /// IP address of the controller for network communication
    /// </summary>
    public string IPAddress { get; set; }

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