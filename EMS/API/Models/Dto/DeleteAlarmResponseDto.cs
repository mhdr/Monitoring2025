using System.Text.Json.Serialization;

namespace API.Models.Dto;

/// <summary>
/// Response DTO for deleting an alarm operation
/// </summary>
public class DeleteAlarmResponseDto
{
    /// <summary>
    /// Indicates whether the alarm was successfully deleted
    /// </summary>
    /// <example>true</example>
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    /// <summary>
    /// Descriptive message about the deletion result
    /// </summary>
    /// <example>Alarm deleted successfully</example>
    [JsonPropertyName("message")]
    public string? Message { get; set; }
}