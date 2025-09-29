namespace API.Models.Dto;

/// <summary>
/// Request DTO for retrieving active alarms for specific items
/// </summary>
public class ActiveAlarmsRequestDto
{
    /// <summary>
    /// List of monitoring item IDs to get active alarms for. Leave empty to get all active alarms.
    /// </summary>
    public List<string> ItemIds { get; set; }

    public ActiveAlarmsRequestDto()
    {
        ItemIds = new();
    }
}