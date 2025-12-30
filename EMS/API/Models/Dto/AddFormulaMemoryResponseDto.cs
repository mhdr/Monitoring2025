namespace API.Models.Dto;

/// <summary>
/// Response DTO for adding a formula memory
/// </summary>
public class AddFormulaMemoryResponseDto
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
    /// The ID of the newly created formula memory
    /// </summary>
    public Guid? Id { get; set; }
}
