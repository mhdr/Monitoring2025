using System.Text.Json.Serialization;

namespace API.Models.Dto;

/// <summary>
/// Response DTO for adding an external alarm operation
/// </summary>
public class AddExternalAlarmResponseDto
{
    /// <summary>
    /// Indicates whether the external alarm was successfully created
    /// </summary>
    /// <example>true</example>
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    /// <summary>
    /// Descriptive message about the operation result
    /// </summary>
    /// <example>External alarm added successfully</example>
    [JsonPropertyName("message")]
    public string? Message { get; set; }

    /// <summary>
    /// The unique identifier of the newly created external alarm
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440003</example>
    [JsonPropertyName("externalAlarmId")]
    public Guid? ExternalAlarmId { get; set; }
}
