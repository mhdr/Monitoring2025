namespace API.Models.Dto;

/// <summary>
/// Request DTO for getting Sharp7 mappings by item ID
/// </summary>
public class GetSharp7MappingsByItemIdRequestDto
{
    /// <summary>
    /// ID of the item to get mappings for
    /// </summary>
    public Guid ItemId { get; set; }
}
