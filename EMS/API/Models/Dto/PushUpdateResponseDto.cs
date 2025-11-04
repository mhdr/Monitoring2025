namespace API.Models.Dto;

/// <summary>
/// Response model for settings update notification push operation
/// </summary>
public class PushUpdateResponseDto
{
    /// <summary>
    /// Indicates whether the update notification was successfully broadcasted
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Descriptive message about the operation result
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Number of connected clients that received the update notification
    /// </summary>
    public int ClientsNotified { get; set; }

    /// <summary>
    /// Timestamp when the notification was sent (Unix timestamp)
    /// </summary>
    public long Timestamp { get; set; }
}
