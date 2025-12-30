namespace API.Models.Dto;

/// <summary>
/// Response DTO for adding an IF memory
/// </summary>
public class AddIfMemoryResponseDto
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
    /// The ID of the newly created IF memory
    /// </summary>
    public Guid? Id { get; set; }
}
