using System.Text.Json.Serialization;

namespace API.Models.Dto;

/// <summary>
/// Response model for batch edit external alarms operation
/// </summary>
public class BatchEditExternalAlarmsResponseDto
{
    /// <summary>
    /// Indicates whether the batch edit operation was successful
    /// </summary>
    /// <example>true</example>
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    /// <summary>
    /// Detailed message about the operation result
    /// </summary>
    /// <example>Batch edit external alarms completed successfully: 2 added, 1 updated, 1 deleted</example>
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Number of external alarms added
    /// </summary>
    /// <example>2</example>
    [JsonPropertyName("addedCount")]
    public int AddedCount { get; set; }

    /// <summary>
    /// Number of external alarms updated
    /// </summary>
    /// <example>1</example>
    [JsonPropertyName("updatedCount")]
    public int UpdatedCount { get; set; }

    /// <summary>
    /// Number of external alarms deleted
    /// </summary>
    /// <example>1</example>
    [JsonPropertyName("deletedCount")]
    public int DeletedCount { get; set; }
}
