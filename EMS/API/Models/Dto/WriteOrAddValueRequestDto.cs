using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request model for writing or adding a value to a monitoring item
/// </summary>
public class WriteOrAddValueRequestDto
{
    /// <summary>
    /// Unique identifier of the monitoring item to write the value to
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    [Required(ErrorMessage = "ItemId is required")]
    public Guid ItemId { get; set; }

    /// <summary>
    /// Value to be written or added to the monitoring item
    /// </summary>
    /// <example>25.7</example>
    [Required(ErrorMessage = "Value is required")]
    public string Value { get; set; } = string.Empty;

    /// <summary>
    /// Optional Unix timestamp for the value. If not provided, current time will be used
    /// </summary>
    /// <example>1697587200</example>
    public long? Time { get; set; }
}