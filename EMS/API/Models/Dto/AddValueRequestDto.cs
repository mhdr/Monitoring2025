namespace API.Models.Dto;

/// <summary>
/// Request DTO for manually adding a value to a monitoring point
/// </summary>
public class AddValueRequestDto
{
    /// <summary>
    /// ID of the monitoring item to add the value to
    /// </summary>
    public Guid ItemId { get; set; }

    /// <summary>
    /// Value to add (as string, will be converted based on item type)
    /// </summary>
    public string Value { get; set; }

    /// <summary>
    /// Unix timestamp when the value was recorded
    /// </summary>
    public long Time { get; set; }
}