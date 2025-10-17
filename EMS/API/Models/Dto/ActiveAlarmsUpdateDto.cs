namespace API.Models.Dto;

/// <summary>
/// Request DTO for broadcasting active alarms updates to SignalR clients
/// </summary>
public class BroadcastActiveAlarmsRequestDto
{
    /// <summary>
    /// Number of active alarms
    /// </summary>
    /// <example>5</example>
    public int AlarmCount { get; set; }

    /// <summary>
    /// Unix timestamp (seconds since epoch) when the update was generated
    /// </summary>
    /// <example>1634567890</example>
    public long Timestamp { get; set; }
}

/// <summary>
/// Response DTO for active alarms broadcast operation
/// </summary>
public class BroadcastActiveAlarmsResponseDto
{
    /// <summary>
    /// Indicates if the broadcast was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Number of connected clients that received the broadcast
    /// </summary>
    public int ClientCount { get; set; }

    /// <summary>
    /// Error message if broadcast failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}
