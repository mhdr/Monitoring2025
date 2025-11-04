using System.Text.Json.Serialization;

namespace API.Models.Dto;

/// <summary>
/// Response DTO for removing an external alarm operation
/// </summary>
public class RemoveExternalAlarmResponseDto
{
    /// <summary>
    /// Indicates whether the external alarm was successfully removed
    /// </summary>
    /// <example>true</example>
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    /// <summary>
    /// Descriptive message about the operation result
    /// </summary>
    /// <example>External alarm removed successfully</example>
    [JsonPropertyName("message")]
    public string? Message { get; set; }
}
