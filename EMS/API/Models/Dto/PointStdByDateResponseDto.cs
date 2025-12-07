using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace API.Models.Dto;

/// <summary>
/// Daily standard deviation result for date-grouped calculation.
/// </summary>
public class DailyStdValue
{
    /// <summary>
    /// Date in Jalali (Persian) calendar format (e.g., "1403/09/16").
    /// </summary>
    [JsonPropertyName("date")]
    public string Date { get; set; } = string.Empty;

    /// <summary>
    /// Standard deviation for this date.
    /// </summary>
    [JsonPropertyName("value")]
    public double Value { get; set; }

    /// <summary>
    /// Number of data points used in this calculation.
    /// </summary>
    [JsonPropertyName("count")]
    public int Count { get; set; }
}

/// <summary>
/// Response DTO for standard deviation values grouped by Jalali date.
/// </summary>
public class PointStdByDateResponseDto
{
    /// <summary>
    /// Indicates whether the operation was successful.
    /// </summary>
    [JsonPropertyName("success")]
    public bool Success { get; set; } = true;

    /// <summary>
    /// List of daily standard deviation values.
    /// </summary>
    [JsonPropertyName("dailyValues")]
    public List<DailyStdValue> DailyValues { get; set; } = new();

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
