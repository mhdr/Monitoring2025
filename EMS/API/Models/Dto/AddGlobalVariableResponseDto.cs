namespace API.Models.Dto;

/// <summary>
/// Response DTO for adding a global variable
/// </summary>
public class AddGlobalVariableResponseDto
{
    /// <summary>
    /// Indicates if the operation was successful
    /// </summary>
    public bool IsSuccessful { get; set; } = true;

    /// <summary>
    /// Error message if operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// ID of the created global variable
    /// </summary>
    public Guid? Id { get; set; }
}
