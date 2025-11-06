using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request model for retrieving user permissions for monitoring items
/// </summary>
public class GetPermissionsRequestDto
{
    /// <summary>
    /// The ID of the user to retrieve permissions for
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    [Required(ErrorMessage = "UserId is required")]
    public string UserId { get; set; } = string.Empty;
}
