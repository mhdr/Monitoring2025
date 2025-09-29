namespace API.Models.Dto;

/// <summary>
/// Request DTO for retrieving audit log entries
/// </summary>
public class AuditLogRequestDto
{
    /// <summary>
    /// Optional item ID to filter audit logs. Leave null to get logs for all items.
    /// </summary>
    public string? ItemId { get; set; }

    /// <summary>
    /// Start date as Unix timestamp to filter logs from
    /// </summary>
    public long StartDate { get; set; }

    /// <summary>
    /// End date as Unix timestamp to filter logs until
    /// </summary>
    public long EndDate { get; set; }
}