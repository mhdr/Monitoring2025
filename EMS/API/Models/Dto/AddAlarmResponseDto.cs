using System.Text.Json.Serialization;

namespace API.Models.Dto;

/// <summary>
/// Response DTO for adding an alarm operation
/// </summary>
public class AddAlarmResponseDto
{
    /// <summary>
    /// Indicates whether the alarm was successfully added
    /// </summary>
    /// <example>true</example>
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    /// <summary>
    /// Descriptive message about the operation result
    /// </summary>
    /// <example>Alarm created successfully</example>
    [JsonPropertyName("message")]
    public string? Message { get; set; }

    /// <summary>
    /// The unique identifier of the newly created alarm (only present on successful creation)
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    [JsonPropertyName("alarmId")]
    public Guid? AlarmId { get; set; }
}