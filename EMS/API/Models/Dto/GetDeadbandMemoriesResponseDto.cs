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
    public Guid InputItemId { get; set; }
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
