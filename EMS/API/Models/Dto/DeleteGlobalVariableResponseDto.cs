namespace API.Models.Dto;

/// <summary>
/// Response DTO for deleting a global variable
/// </summary>
public class DeleteGlobalVariableResponseDto
{
    /// <summary>
    /// Indicates if the operation was successful
    /// </summary>
    public bool IsSuccessful { get; set; } = true;

    /// <summary>
    /// Error message if operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}
