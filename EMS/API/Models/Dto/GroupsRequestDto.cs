using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for retrieving groups accessible to a user
/// </summary>
public class GroupsRequestDto
{
    /// <summary>
    /// Optional user ID to get groups for a specific user (admin only)
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    public string? UserId { get; set; }
}