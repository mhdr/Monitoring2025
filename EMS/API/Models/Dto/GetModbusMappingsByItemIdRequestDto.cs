namespace API.Models.Dto;

/// <summary>
/// Request DTO for getting Modbus mappings by item ID
/// </summary>
public class GetModbusMappingsByItemIdRequestDto
{
    /// <summary>
    /// ID of the item to get mappings for
    /// </summary>
    public Guid ItemId { get; set; }
}
