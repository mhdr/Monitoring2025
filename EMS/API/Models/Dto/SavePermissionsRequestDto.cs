namespace API.Models.Dto;

/// <summary>
/// Request model for saving user permissions for monitoring items
/// </summary>
public class SavePermissionsRequestDto
{
    /// <summary>
    /// The ID of the user to save permissions for
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    public string UserId { get; set; } = string.Empty;
    
    /// <summary>
    /// List of monitoring item IDs that the user should have access to
    /// </summary>
    /// <example>["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"]</example>
    public List<string> ItemPermissions { get; set; }

    /// <summary>
    /// Initializes a new instance of SavePermissionsRequestDto
    /// </summary>
    public SavePermissionsRequestDto()
    {
        ItemPermissions = new();
    }
}