namespace API.Models.Dto;

/// <summary>
/// Response DTO for batch editing Modbus mappings
/// </summary>
public class BatchEditModbusMapsResponseDto
{
    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// Number of mappings added
    /// </summary>
    public int AddedCount { get; set; }

    /// <summary>
    /// Number of mappings updated
    /// </summary>
    public int ChangedCount { get; set; }

    /// <summary>
    /// Number of mappings removed
    /// </summary>
    public int RemovedCount { get; set; }

    /// <summary>
    /// Error message if the operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}
