namespace API.Models.Dto;

/// <summary>
/// Response model for saving user permissions operation
/// </summary>
public class SavePermissionsResponseDto
{
    /// <summary>
    /// Indicates whether the permission save operation was successful
    /// </summary>
    /// <example>true</example>
    public bool Success { get; set; }

    /// <summary>
    /// Descriptive message about the operation result
    /// </summary>
    /// <example>User permissions saved successfully</example>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Number of permissions saved for the user
    /// </summary>
    /// <example>15</example>
    public int PermissionsCount { get; set; }
}