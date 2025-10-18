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
    /// Initializes a new instance of AlarmHistoryRequestDto
    /// </summary>
    public AlarmHistoryRequestDto()
    {
        ItemIds = new();
    }
}