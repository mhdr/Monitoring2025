namespace API.Models.Dto;

/// <summary>
/// Response DTO for getting totalizer memories
/// </summary>
public class GetTotalizerMemoriesResponseDto
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
    /// List of totalizer memory items
    /// </summary>
    public List<TotalizerMemoryItemDto> TotalizerMemories { get; set; } = [];
}

/// <summary>
/// Individual totalizer memory item DTO
/// </summary>
public class TotalizerMemoryItemDto
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    
    /// <summary>
    /// Input source type: 0 = Point, 1 = GlobalVariable
    /// </summary>
    public int InputType { get; set; }
    
    /// <summary>
    /// Input reference: GUID for Point, name for GlobalVariable
    /// </summary>
    public string InputReference { get; set; } = string.Empty;
    
    /// <summary>
    /// Output source type: 0 = Point, 1 = GlobalVariable
    /// </summary>
    public int OutputType { get; set; }
    
    /// <summary>
    /// Output reference: GUID for Point, name for GlobalVariable
    /// </summary>
    public string OutputReference { get; set; } = string.Empty;
    
    /// <summary>
    /// Legacy field for backward compatibility
    /// </summary>
    [Obsolete("Use InputReference and InputType instead")]
    public Guid InputItemId { get; set; }
    
    /// <summary>
    /// Legacy field for backward compatibility
    /// </summary>
    [Obsolete("Use OutputReference and OutputType instead")]
    public Guid OutputItemId { get; set; }
    
    public int Interval { get; set; }
    public bool IsDisabled { get; set; }
    public int AccumulationType { get; set; }
    public bool ResetOnOverflow { get; set; }
    public double? OverflowThreshold { get; set; }
    public bool ManualResetEnabled { get; set; }
    public bool ScheduledResetEnabled { get; set; }
    public string? ResetCron { get; set; }
    public DateTime? LastResetTime { get; set; }
    public double AccumulatedValue { get; set; }
    public double? LastInputValue { get; set; }
    public bool? LastEventState { get; set; }
    public string? Units { get; set; }
    public int DecimalPlaces { get; set; }
}
