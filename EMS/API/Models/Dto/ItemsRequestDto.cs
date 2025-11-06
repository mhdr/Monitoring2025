using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request model for retrieving monitoring items with filtering options
/// </summary>
public class ItemsRequestDto
{
    /// <summary>
    /// Whether to include orphaned items that are not assigned to any group.
    /// When true, returns all items including those without group assignment.
    /// When false, only returns items that belong to a group.
    /// </summary>
    /// <example>false</example>
    public bool ShowOrphans { get; set; } = false;
}
