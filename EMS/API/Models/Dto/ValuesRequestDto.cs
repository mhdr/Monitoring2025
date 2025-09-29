namespace API.Models.Dto;

/// <summary>
/// Request DTO for retrieving current values of monitoring items
/// </summary>
public class ValuesRequestDto
{
    /// <summary>
    /// List of monitoring item IDs to get current values for. Leave empty to get all values.
    /// </summary>
    public List<string> ItemIds { get; set; }

    public ValuesRequestDto()
    {
        ItemIds = new();
    }
}