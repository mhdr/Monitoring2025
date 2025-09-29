using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for retrieving monitoring items
/// </summary>
public class ItemsRequestDto
{
    /// <summary>
    /// Optional user ID to get items for a specific user (admin only)
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    public string? UserId { get; set; }

    /// <summary>
    /// Whether to include orphaned items that are not assigned to any group
    /// </summary>
    /// <example>false</example>
    public bool ShowOrphans { get; set; } = false;
}