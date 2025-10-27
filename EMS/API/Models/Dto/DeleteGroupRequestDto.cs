using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request model for deleting a monitoring group
/// </summary>
public class DeleteGroupRequestDto
{
    /// <summary>
    /// Unique identifier of the group to delete
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    [Required(ErrorMessage = "Group ID is required")]
    public Guid Id { get; set; }
}