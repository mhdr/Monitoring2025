namespace API.Models.Dto;

/// <summary>
/// Request DTO for deleting a monitoring item
/// </summary>
public class DeleteItemRequestDto
{
    /// <summary>
    /// Unique identifier of the monitoring item to delete
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    public Guid Id { get; set; }
}
