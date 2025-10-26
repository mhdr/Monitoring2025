using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request model for retrieving a single monitoring item by ID
/// </summary>
public class GetItemRequestDto
{
    /// <summary>
    /// Unique identifier of the monitoring item to retrieve
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    [Required(ErrorMessage = "ItemId is required")]
    public string ItemId { get; set; } = string.Empty;
}
