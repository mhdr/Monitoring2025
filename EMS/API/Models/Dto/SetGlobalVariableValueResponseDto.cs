namespace API.Models.Dto;

/// <summary>
/// Response DTO for setting a global variable's runtime value
/// </summary>
public class SetGlobalVariableValueResponseDto
{
    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool IsSuccessful { get; set; } = true;

    /// <summary>
    /// Error message if operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}
