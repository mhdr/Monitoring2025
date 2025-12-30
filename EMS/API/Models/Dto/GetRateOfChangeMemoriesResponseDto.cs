namespace API.Models.Dto;

/// <summary>
/// Response DTO for getting rate of change memories
/// </summary>
public class GetRateOfChangeMemoriesResponseDto
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
    /// List of rate of change memory items
    /// </summary>
    public List<RateOfChangeMemoryItemDto>? RateOfChangeMemories { get; set; }
}

/// <summary>
/// Individual rate of change memory item DTO
/// </summary>
public class RateOfChangeMemoryItemDto
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public Guid InputItemId { get; set; }
    public Guid OutputItemId { get; set; }
    public Guid? AlarmOutputItemId { get; set; }
    public int Interval { get; set; }
    public bool IsDisabled { get; set; }
    public int CalculationMethod { get; set; }
    public int TimeWindowSeconds { get; set; }
    public double SmoothingFilterAlpha { get; set; }
    public double? HighRateThreshold { get; set; }
    public double? LowRateThreshold { get; set; }
    public double HighRateHysteresis { get; set; }
    public double LowRateHysteresis { get; set; }
    public bool? AlarmState { get; set; }
    public int BaselineSampleCount { get; set; }
    public int AccumulatedSamples { get; set; }
    public int TimeUnit { get; set; }
    public string? RateUnitDisplay { get; set; }
    public int DecimalPlaces { get; set; }
    public double? LastSmoothedRate { get; set; }
    public double? LastInputValue { get; set; }
    public long? LastTimestamp { get; set; }
}
