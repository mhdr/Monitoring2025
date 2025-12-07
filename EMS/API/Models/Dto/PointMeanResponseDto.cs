using System.Text.Json.Serialization;

namespace API.Models.Dto;

/// <summary>
/// Response DTO for the mean calculation of an analog point.
/// </summary>
public class PointMeanResponseDto
{
    /// <summary>
    /// Indicates whether the operation was successful.
    /// </summary>
    [JsonPropertyName("success")]
    public bool Success { get; set; } = true;

    /// <summary>
    /// The calculated mean value for the specified time range.
    /// Null if the point is not an analog point or no data is available.
    /// </summary>
    [JsonPropertyName("mean")]
    public double? Mean { get; set; }

    /// <summary>
    /// The number of data points used in the mean calculation.
    /// </summary>
    [JsonPropertyName("count")]
    public int Count { get; set; }

    /// <summary>
    /// Error message if the operation failed.
    /// </summary>
    [JsonPropertyName("errorMessage")]
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Item ID that the mean was calculated for.
    /// </summary>
    [JsonPropertyName("itemId")]
    public string? ItemId { get; set; }
}
