namespace API.Models.Dto;

/// <summary>
/// Response DTO for deleting a formula memory
/// </summary>
public class DeleteFormulaMemoryResponseDto
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
