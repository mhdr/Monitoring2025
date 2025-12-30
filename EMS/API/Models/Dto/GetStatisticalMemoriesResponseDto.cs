namespace API.Models.Dto;

/// <summary>
/// Response DTO for getting statistical memories
/// </summary>
public class GetStatisticalMemoriesResponseDto
{
    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// Error message if operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// List of statistical memory items
    /// </summary>
    public List<StatisticalMemoryItemDto>? StatisticalMemories { get; set; }
}

/// <summary>
/// Individual statistical memory item DTO
/// </summary>
public class StatisticalMemoryItemDto
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public Guid InputItemId { get; set; }
    public int Interval { get; set; }
    public bool IsDisabled { get; set; }
    
    // Window configuration
    public int WindowSize { get; set; }
    public int WindowType { get; set; }
    public int MinSamples { get; set; }
    
    // Optional output items
    public Guid? OutputMinItemId { get; set; }
    public Guid? OutputMaxItemId { get; set; }
    public Guid? OutputAvgItemId { get; set; }
    public Guid? OutputStdDevItemId { get; set; }
    public Guid? OutputRangeItemId { get; set; }
    public Guid? OutputMedianItemId { get; set; }
    public Guid? OutputCVItemId { get; set; }
    
    // Percentiles configuration (JSON array)
    public string PercentilesConfig { get; set; } = "[]";
    
    // State tracking
    public int CurrentBatchCount { get; set; }
    public long? LastResetTime { get; set; }
}

/// <summary>
/// Percentile configuration for API responses
/// </summary>
public class PercentileConfigDto
{
    public double Percentile { get; set; }
    public Guid OutputItemId { get; set; }
}
