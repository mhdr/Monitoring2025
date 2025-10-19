using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for retrieving audit log entries within a date range
/// </summary>
public class AuditLogRequestDto
{
    /// <summary>
    /// Optional item ID (GUID format) to filter audit logs for a specific monitoring item. Leave null to get logs for all items.
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440001</example>
    public string? ItemId { get; set; }

    /// <summary>
    /// Start date as Unix timestamp (seconds since epoch) to filter logs from. Must be a positive value.
    /// </summary>
    /// <example>1697587200</example>
    [Required(ErrorMessage = "StartDate is required")]
    [Range(1, long.MaxValue, ErrorMessage = "StartDate must be a positive Unix timestamp")]
    public long StartDate { get; set; }

    /// <summary>
    /// End date as Unix timestamp (seconds since epoch) to filter logs until. Must be a positive value and greater than or equal to StartDate.
    /// </summary>
    /// <example>1697673600</example>
    [Required(ErrorMessage = "EndDate is required")]
    [Range(1, long.MaxValue, ErrorMessage = "EndDate must be a positive Unix timestamp")]
    public long EndDate { get; set; }
}