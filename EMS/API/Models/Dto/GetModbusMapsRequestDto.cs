namespace API.Models.Dto;

/// <summary>
/// Request DTO for getting Modbus mappings for a specific controller
/// </summary>
public class GetModbusMapsRequestDto
{
    /// <summary>
    /// ID of the controller to get mappings for
    /// </summary>
    public Guid ControllerId { get; set; }
}
