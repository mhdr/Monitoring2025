using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request model for moving a monitoring point to a different group
/// </summary>
public class MovePointRequestDto
{
    /// <summary>
    /// The unique identifier of the monitoring point to move
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    [Required(ErrorMessage = "PointId is required")]
    public Guid PointId { get; set; }

    /// <summary>
    /// The unique identifier of the destination group
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440001</example>
    [Required(ErrorMessage = "ParentId is required")]
    public Guid ParentId { get; set; }
}