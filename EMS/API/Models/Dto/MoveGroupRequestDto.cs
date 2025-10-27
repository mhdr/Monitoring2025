using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request model for moving a group to a different parent in the hierarchy
/// </summary>
public class MoveGroupRequestDto
{
    /// <summary>
    /// The ID of the group to move
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    [Required(ErrorMessage = "GroupId is required")]
    public Guid GroupId { get; set; }
    
    /// <summary>
    /// The ID of the new parent group (null for root level)
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440001</example>
    public Guid? ParentId { get; set; }
}