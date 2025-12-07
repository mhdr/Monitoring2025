using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace API.Models.Dto;

/// <summary>
/// Daily count result for date-grouped calculation.
/// </summary>
public class DailyCount
{
    /// <summary>
    /// Date in Jalali (Persian) calendar format (e.g., "1403/09/16").
    /// </summary>
    [JsonPropertyName("date")]
    public string Date { get; set; } = string.Empty;

    /// <summary>
    /// Number of data points for this date.
    /// </summary>
    [JsonPropertyName("count")]
    public int Count { get; set; }
}

/// <summary>
/// Response DTO for data point counts grouped by Jalali date.
/// </summary>
public class PointCountByDateResponseDto
{
    /// <summary>
    /// Indicates whether the operation was successful.
    /// </summary>
    [JsonPropertyName("success")]
    public bool Success { get; set; } = true;

    /// <summary>
    /// List of daily counts.
    /// </summary>
    [JsonPropertyName("dailyCounts")]
    public List<DailyCount> DailyCounts { get; set; } = new();

    /// <summary>
    /// Error message if the operation failed.
    /// </summary>
    [JsonPropertyName("errorMessage")]
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Item ID that the calculation was performed for.
    /// </summary>
    [JsonPropertyName("itemId")]
    public string? ItemId { get; set; }
}
