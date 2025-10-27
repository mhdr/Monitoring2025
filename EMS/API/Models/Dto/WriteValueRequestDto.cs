namespace API.Models.Dto;

/// <summary>
/// Request model for writing a value directly to a controller
/// </summary>
public class WriteValueRequestDto
{
    /// <summary>
    /// Unique identifier of the monitoring item to write the value to
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    public Guid ItemId { get; set; }

    /// <summary>
    /// Value to be written to the controller
    /// </summary>
    /// <example>25.7</example>
    public string Value { get; set; } = string.Empty;

    /// <summary>
    /// Optional Unix timestamp for the value. If not provided, current time will be used
    /// </summary>
    /// <example>1697587200</example>
    public long? Time { get; set; }

    /// <summary>
    /// Optional duration in seconds for how long the value should persist or be valid
    /// </summary>
    /// <example>60</example>
    public long? Duration { get; set; }
}