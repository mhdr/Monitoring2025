using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request model for retrieving active alarms for specific monitoring items
/// </summary>
public class ActiveAlarmsRequestDto
{
    /// <summary>
    /// List of monitoring item IDs to get active alarms for. Leave empty or null to get all active alarms.
    /// </summary>
    /// <example>["3fa85f64-5717-4562-b3fc-2c963f66afa6", "4fa85f64-5717-4562-b3fc-2c963f66afa7"]</example>
    public List<string>? ItemIds { get; set; } = new();
}