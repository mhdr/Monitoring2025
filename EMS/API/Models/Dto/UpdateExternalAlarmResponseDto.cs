using System.Text.Json.Serialization;

namespace API.Models.Dto;

/// <summary>
/// Response DTO for updating an external alarm operation
/// </summary>
public class UpdateExternalAlarmResponseDto
{
    /// <summary>
    /// Indicates whether the external alarm was successfully updated
    /// </summary>
    /// <example>true</example>
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    /// <summary>
    /// Descriptive message about the operation result
    /// </summary>
    /// <example>External alarm updated successfully</example>
    [JsonPropertyName("message")]
    public string? Message { get; set; }
}
