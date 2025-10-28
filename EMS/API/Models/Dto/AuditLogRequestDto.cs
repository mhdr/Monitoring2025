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

    /// <summary>
    /// Page number for pagination (1-based index). Defaults to 1 if not provided.
    /// </summary>
    /// <example>1</example>
    [Range(1, int.MaxValue, ErrorMessage = "Page must be a positive integer")]
    public int? Page { get; set; }

    /// <summary>
    /// Number of records per page. Defaults to 50 if not provided. Maximum 500.
    /// </summary>
    /// <example>50</example>
    [Range(1, 500, ErrorMessage = "PageSize must be between 1 and 500")]
    public int? PageSize { get; set; }
}