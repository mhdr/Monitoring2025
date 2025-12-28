namespace API.Models.Dto;

/// <summary>
/// Response DTO for adding a new timeout memory configuration
/// </summary>
public class AddTimeoutMemoryResponseDto
{
    /// <summary>
    /// Indicates whether the operation was successful
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// Error message if operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// ID of the newly created timeout memory
    /// </summary>
    public Guid? Id { get; set; }
}
