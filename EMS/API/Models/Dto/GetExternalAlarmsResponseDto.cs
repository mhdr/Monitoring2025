namespace API.Models.Dto;

/// <summary>
/// Response model containing external alarm configurations
/// </summary>
public class GetExternalAlarmsResponseDto
{
    /// <summary>
    /// Indicates whether the operation was successful
    /// </summary>
    /// <example>true</example>
    public bool Success { get; set; } = true;

    /// <summary>
    /// Optional message providing additional information
    /// </summary>
    /// <example>External alarms retrieved successfully</example>
    public string? Message { get; set; }

    /// <summary>
    /// List of external alarm configurations associated with the parent alarm
    /// </summary>
    public List<ExternalAlarmInfo> ExternalAlarms { get; set; } = [];

    /// <summary>
    /// Represents an external alarm configuration
    /// </summary>
    public class ExternalAlarmInfo
    {
        /// <summary>
        /// Unique identifier for the external alarm
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440001</example>
        public Guid Id { get; set; }

        /// <summary>
        /// The parent alarm ID that this external alarm belongs to
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440000</example>
        public Guid AlarmId { get; set; }

        /// <summary>
        /// The monitoring item ID associated with this external alarm
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440002</example>
        public Guid ItemId { get; set; }

        /// <summary>
        /// The output value to write when this external alarm is triggered
        /// </summary>
        /// <example>true</example>
        public bool Value { get; set; }

        /// <summary>
        /// Indicates whether this external alarm is currently disabled
        /// </summary>
        /// <example>false</example>
        public bool IsDisabled { get; set; }
    }
}