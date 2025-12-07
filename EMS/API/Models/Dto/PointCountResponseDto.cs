using System.Text.Json.Serialization;

namespace API.Models.Dto;

/// <summary>
/// Response DTO for counting data points of an analog point.
/// </summary>
public class PointCountResponseDto
{
    /// <summary>
    /// Indicates whether the operation was successful.
    /// </summary>
    [JsonPropertyName("success")]
    public bool Success { get; set; } = true;

    /// <summary>
    /// The number of data points in the specified time range.
    /// </summary>
    [JsonPropertyName("count")]
    public int Count { get; set; }

    /// <summary>
    /// Error message if the operation failed.
    /// </summary>
    [JsonPropertyName("errorMessage")]
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Item ID that the count was calculated for.
    /// </summary>
    [JsonPropertyName("itemId")]
    public string? ItemId { get; set; }
}
