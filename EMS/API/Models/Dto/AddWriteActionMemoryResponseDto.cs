namespace API.Models.Dto;

/// <summary>
/// Response DTO for adding a new write action memory configuration
/// </summary>
public class AddWriteActionMemoryResponseDto
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
    /// ID of the newly created write action memory
    /// </summary>
    public Guid? Id { get; set; }
}
