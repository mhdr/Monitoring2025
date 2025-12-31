namespace API.Models.Dto;

/// <summary>
/// Response DTO for adding a deadband memory
/// </summary>
public class AddDeadbandMemoryResponseDto
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
    /// ID of the newly created deadband memory
    /// </summary>
    public Guid? Id { get; set; }
}
