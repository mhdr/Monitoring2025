namespace API.Models.Dto;

/// <summary>
/// Response model for retrieving user permissions
/// </summary>
public class GetPermissionsResponseDto
{
    /// <summary>
    /// Indicates whether the operation was successful
    /// </summary>
    /// <example>true</example>
    public bool Success { get; set; }

    /// <summary>
    /// Descriptive message about the operation result
    /// </summary>
    /// <example>User permissions retrieved successfully</example>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// The user ID that permissions were retrieved for
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    public string? UserId { get; set; }

    /// <summary>
    /// The username of the user
    /// </summary>
    /// <example>johndoe</example>
    public string? UserName { get; set; }

    /// <summary>
    /// List of monitoring item IDs that the user has access to
    /// </summary>
    /// <example>["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"]</example>
    public List<string> ItemIds { get; set; }

    /// <summary>
    /// Total count of items the user has access to
    /// </summary>
    /// <example>25</example>
    public int TotalCount { get; set; }

    /// <summary>
    /// Initializes a new instance of GetPermissionsResponseDto
    /// </summary>
    public GetPermissionsResponseDto()
    {
        ItemIds = new();
    }
}
