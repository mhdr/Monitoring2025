namespace API.Models.Dto;

/// <summary>
/// Response DTO for editing a formula memory
/// </summary>
public class EditFormulaMemoryResponseDto
{
    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// Error message if operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}
