namespace API.Models.Dto;

/// <summary>
/// Response DTO for editing an alarm operation
/// </summary>
public class EditAlarmResponseDto
{
    /// <summary>
    /// Indicates whether the alarm was successfully updated
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Descriptive message about the operation result
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Error type if the operation failed
    /// </summary>
    public EditAlarmErrorType? Error { get; set; }

    /// <summary>
    /// Possible error types for alarm editing operations
    /// </summary>
    public enum EditAlarmErrorType
    {
        /// <summary>
        /// Input validation failed
        /// </summary>
        ValidationError,

        /// <summary>
        /// Alarm not found
        /// </summary>
        AlarmNotFound,

        /// <summary>
        /// Item not found
        /// </summary>
        ItemNotFound,

        /// <summary>
        /// Database operation failed
        /// </summary>
        DatabaseError,

        /// <summary>
        /// Unknown error occurred
        /// </summary>
        UnknownError
    }
}