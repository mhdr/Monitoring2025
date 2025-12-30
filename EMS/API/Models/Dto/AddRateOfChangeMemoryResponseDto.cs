namespace API.Models.Dto;

/// <summary>
/// Response DTO for adding a rate of change memory
/// </summary>
public class AddRateOfChangeMemoryResponseDto
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
    /// ID of the newly created rate of change memory
    /// </summary>
    public Guid? Id { get; set; }
}
