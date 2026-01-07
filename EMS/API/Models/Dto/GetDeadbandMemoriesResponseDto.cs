namespace API.Models.Dto;

/// <summary>
/// Response DTO for getting deadband memories
/// </summary>
public class GetDeadbandMemoriesResponseDto
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
    /// List of deadband memory items
    /// </summary>
    public List<DeadbandMemoryItemDto>? DeadbandMemories { get; set; }
}

/// <summary>
/// Individual deadband memory item DTO
/// </summary>
public class DeadbandMemoryItemDto
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    
    /// <summary>
    /// Type of the input source: 0=Point, 1=GlobalVariable
    /// </summary>
    public int InputType { get; set; }
    
    /// <summary>
    /// Reference to the input source (GUID string for Point, name for GlobalVariable)
    /// </summary>
    public string InputReference { get; set; } = string.Empty;
    
    /// <summary>
    /// Type of the output source: 0=Point, 1=GlobalVariable
    /// </summary>
    public int OutputType { get; set; }
    
    /// <summary>
    /// Reference to the output source (GUID string for Point, name for GlobalVariable)
    /// </summary>
    public string OutputReference { get; set; } = string.Empty;
    
    /// <summary>
    /// [DEPRECATED] Use InputReference and InputType instead
    /// </summary>
    public Guid InputItemId { get; set; }
    
    /// <summary>
    /// [DEPRECATED] Use OutputReference and OutputType instead
    /// </summary>
    public Guid OutputItemId { get; set; }
    public int Interval { get; set; }
    public bool IsDisabled { get; set; }
    
    // Analog deadband settings
    public double Deadband { get; set; }
    public int DeadbandType { get; set; }
    public double InputMin { get; set; }
    public double InputMax { get; set; }
    
    // Digital stability settings
    public double StabilityTime { get; set; }
    
    // State fields
    public double? LastOutputValue { get; set; }
    public double? LastInputValue { get; set; }
    public long? LastChangeTime { get; set; }
    public bool? PendingDigitalState { get; set; }
    public long? LastTimestamp { get; set; }
}
