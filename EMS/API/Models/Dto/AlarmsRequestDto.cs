namespace API.Models.Dto;

/// <summary>
/// Request DTO for retrieving alarm configurations for specific items
/// </summary>
public class AlarmsRequestDto
{
    /// <summary>
    /// List of monitoring item IDs to get alarms for. Leave empty to get all alarms.
    /// </summary>
    /// <example>
    /// ["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"]
    /// </example>
    public List<string> ItemIds { get; set; }

    /// <summary>
    /// Initializes a new instance of the <see cref="AlarmsRequestDto"/> class.
    /// </summary>
    public AlarmsRequestDto()
    {
        ItemIds = new();
    }
}