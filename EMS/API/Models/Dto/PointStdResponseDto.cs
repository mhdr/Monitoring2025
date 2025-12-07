using System.Text.Json.Serialization;

namespace API.Models.Dto;

/// <summary>
/// Response DTO for the standard deviation calculation of an analog point.
/// </summary>
public class PointStdResponseDto
{
    /// <summary>
    /// Indicates whether the operation was successful.
    /// </summary>
    [JsonPropertyName("success")]
    public bool Success { get; set; } = true;

    /// <summary>
    /// The standard deviation value for the specified time range.
    /// Null if the point is not an analog point or no data is available.
    /// </summary>
    [JsonPropertyName("std")]
    public double? Std { get; set; }

    /// <summary>
    /// The number of data points used in the calculation.
    /// </summary>
    [JsonPropertyName("count")]
    public int Count { get; set; }

    /// <summary>
    /// Error message if the operation failed.
    /// </summary>
    [JsonPropertyName("errorMessage")]
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Item ID that the standard deviation was calculated for.
    /// </summary>
    [JsonPropertyName("itemId")]
    public string? ItemId { get; set; }
}
