namespace API.Models.Dto;

/// <summary>
/// Request DTO for deleting a Modbus controller
/// </summary>
public class DeleteModbusControllerRequestDto
{
    /// <summary>
    /// Unique identifier of the controller to delete
    /// </summary>
    public Guid Id { get; set; }
}
