using System.Text.Json.Serialization;

namespace API.Models.Dto;

/// <summary>
/// Response DTO containing the calculated duration for a digital point's state.
/// </summary>
public class CalculateStateDurationResponseDto
{
    /// <summary>
    /// Indicates whether the operation was successful.
    /// </summary>
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    /// <summary>
    /// Error message if the operation failed.
    /// </summary>
    [JsonPropertyName("error")]
    public string? Error { get; set; }

    /// <summary>
    /// The value that was matched ("0" or "1").
    /// </summary>
    [JsonPropertyName("matchedValue")]
    public string MatchedValue { get; set; } = string.Empty;

    /// <summary>
    /// Total duration in seconds that the point held the specified value.
    /// </summary>
    [JsonPropertyName("totalDurationSeconds")]
    public long TotalDurationSeconds { get; set; }

    /// <summary>
    /// Human-readable formatted duration string (e.g., "2h 15m 30s").
    /// </summary>
    [JsonPropertyName("formattedDuration")]
    public string FormattedDuration { get; set; } = string.Empty;

    /// <summary>
    /// Number of state changes found in the time range.
    /// </summary>
    [JsonPropertyName("stateChangeCount")]
    public int StateChangeCount { get; set; }

    /// <summary>
    /// Indicates whether the last known state before the start date was used.
    /// </summary>
    [JsonPropertyName("usedLastKnownState")]
    public bool UsedLastKnownState { get; set; }
}
