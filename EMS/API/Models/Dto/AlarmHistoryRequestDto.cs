using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request model for retrieving historical alarm data within a date range
/// </summary>
public class AlarmHistoryRequestDto
{
    /// <summary>
    /// Optional list of item IDs to filter alarms. Leave empty or null to retrieve all alarms.
    /// </summary>
    /// <example>["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"]</example>
    public List<string>? ItemIds { get; set; }
    
    /// <summary>
    /// Start date as Unix timestamp (seconds since epoch)
    /// </summary>
    /// <example>1697587200</example>
    [Required(ErrorMessage = "Start date is required")]
    [Range(1, long.MaxValue, ErrorMessage = "Start date must be a positive Unix timestamp")]
    public long StartDate { get; set; }
    
    /// <summary>
    /// End date as Unix timestamp (seconds since epoch)
    /// </summary>
    /// <example>1697673600</example>
    [Required(ErrorMessage = "End date is required")]
    [Range(1, long.MaxValue, ErrorMessage = "End date must be a positive Unix timestamp")]
    public long EndDate { get; set; }

    /// <summary>
    /// Page number for pagination (1-based index). Defaults to 1 if not provided.
    /// </summary>
    /// <example>1</example>
    [Range(1, int.MaxValue, ErrorMessage = "Page must be a positive integer")]
    public int? Page { get; set; }

    /// <summary>
    /// Number of records per page. Defaults to 100 if not provided. Maximum 1000.
    /// </summary>
    /// <example>100</example>
    [Range(1, 1000, ErrorMessage = "PageSize must be between 1 and 1000")]
    public int? PageSize { get; set; }

    /// <summary>
    /// Initializes a new instance of AlarmHistoryRequestDto
    /// </summary>
    public AlarmHistoryRequestDto()
    {
        ItemIds = new();
    }
}