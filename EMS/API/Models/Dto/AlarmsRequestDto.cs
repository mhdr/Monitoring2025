namespace API.Models.Dto;

/// <summary>
/// Request DTO for retrieving alarm configurations for specific items
/// </summary>
public class AlarmsRequestDto
{
    /// <summary>
    /// List of monitoring item IDs to get alarms for. Leave empty to get all alarms.
    /// </summary>
    public List<string> ItemIds { get; set; }

    public AlarmsRequestDto()
    {
        ItemIds = new();
    }
}