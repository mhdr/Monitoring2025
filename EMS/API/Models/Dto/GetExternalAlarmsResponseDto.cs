using System.Text.Json.Serialization;

namespace API.Models.Dto;

/// <summary>
/// Response DTO for retrieving external alarms
/// </summary>
public class GetExternalAlarmsResponseDto
{
    /// <summary>
    /// Indicates whether the operation was successful
    /// </summary>
    /// <example>true</example>
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    /// <summary>
    /// Descriptive message about the operation result
    /// </summary>
    /// <example>External alarms retrieved successfully</example>
    [JsonPropertyName("message")]
    public string? Message { get; set; }

    /// <summary>
    /// List of external alarm configurations for the parent alarm
    /// </summary>
    [JsonPropertyName("externalAlarms")]
    public List<ExternalAlarmInfo>? ExternalAlarms { get; set; }

    /// <summary>
    /// External alarm configuration information
    /// </summary>
    public class ExternalAlarmInfo
    {
        /// <summary>
        /// Unique identifier for the external alarm
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440001</example>
        [JsonPropertyName("id")]
        public Guid? Id { get; set; }

        /// <summary>
        /// The parent alarm ID that this external alarm belongs to
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440000</example>
        [JsonPropertyName("alarmId")]
        public Guid? AlarmId { get; set; }

        /// <summary>
        /// The monitoring item ID associated with this external alarm
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440002</example>
        [JsonPropertyName("itemId")]
        public Guid? ItemId { get; set; }

        /// <summary>
        /// The output value to write when this external alarm is triggered
        /// </summary>
        /// <example>true</example>
        [JsonPropertyName("value")]
        public bool Value { get; set; }

        /// <summary>
        /// Indicates whether this external alarm is currently disabled
        /// </summary>
        /// <example>false</example>
        [JsonPropertyName("isDisabled")]
        public bool IsDisabled { get; set; }
    }
}
