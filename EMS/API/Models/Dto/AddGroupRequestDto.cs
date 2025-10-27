using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request model for creating a new monitoring group
/// </summary>
public class AddGroupRequestDto
{
    /// <summary>
    /// Name of the monitoring group (required, 1-100 characters)
    /// </summary>
    /// <example>Building A - HVAC System</example>
    [Required(ErrorMessage = "Group name is required")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Group name must be between 1 and 100 characters")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// ID of the parent group for hierarchical organization. Leave null for root-level groups.
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    public Guid? ParentId { get; set; }
}