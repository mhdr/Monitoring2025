namespace API.Models.Dto;

/// <summary>
/// Response DTO after creating a PID memory configuration
/// </summary>
public class AddPIDMemoryResponseDto
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
    /// ID of the newly created PID memory
    /// </summary>
    public Guid? Id { get; set; }
}
