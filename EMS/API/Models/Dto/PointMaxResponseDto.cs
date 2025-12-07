using System.Text.Json.Serialization;

namespace API.Models.Dto;

/// <summary>
/// Response DTO for the maximum value calculation of an analog point.
/// </summary>
public class PointMaxResponseDto
{
    /// <summary>
    /// Indicates whether the operation was successful.
    /// </summary>
    [JsonPropertyName("success")]
    public bool Success { get; set; } = true;

    /// <summary>
    /// The maximum value for the specified time range.
    /// Null if the point is not an analog point or no data is available.
    /// </summary>
    [JsonPropertyName("max")]
    public double? Max { get; set; }

    /// <summary>
    /// The number of data points evaluated.
    /// </summary>
    [JsonPropertyName("count")]
    public int Count { get; set; }

    /// <summary>
    /// Error message if the operation failed.
    /// </summary>
    [JsonPropertyName("errorMessage")]
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Item ID that the maximum was calculated for.
    /// </summary>
    [JsonPropertyName("itemId")]
    public string? ItemId { get; set; }
}
