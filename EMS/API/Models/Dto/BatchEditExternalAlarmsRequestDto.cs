using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace API.Models.Dto;

/// <summary>
/// Request model for batch editing external alarm configurations (add, update, delete multiple in one operation)
/// </summary>
public class BatchEditExternalAlarmsRequestDto
{
    /// <summary>
    /// Parent alarm ID that owns these external alarms
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    [Required(ErrorMessage = "AlarmId is required")]
    [JsonPropertyName("alarmId")]
    public Guid AlarmId { get; set; }

    /// <summary>
    /// List of new external alarms to add
    /// </summary>
    [JsonPropertyName("added")]
    public List<ExternalAlarmDto> Added { get; set; } = new();

    /// <summary>
    /// List of existing external alarms to update (must include Id)
    /// </summary>
    [JsonPropertyName("changed")]
    public List<ExternalAlarmDto> Changed { get; set; } = new();

    /// <summary>
    /// List of external alarms to delete (only Id is required)
    /// </summary>
    [JsonPropertyName("removed")]
    public List<ExternalAlarmDto> Removed { get; set; } = new();

    /// <summary>
    /// External alarm data transfer object
    /// </summary>
    public class ExternalAlarmDto
    {
        /// <summary>
        /// External alarm ID (required for Changed and Removed lists)
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440001</example>
        [JsonPropertyName("id")]
        public Guid? Id { get; set; }

        /// <summary>
        /// Parent alarm ID (automatically set from parent request)
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440000</example>
        [JsonPropertyName("alarmId")]
        public Guid? AlarmId { get; set; }

        /// <summary>
        /// Target item ID that this external alarm controls
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440002</example>
        [JsonPropertyName("itemId")]
        public Guid ItemId { get; set; }

        /// <summary>
        /// Boolean value to write to the target item when alarm triggers (true/false)
        /// </summary>
        /// <example>true</example>
        [JsonPropertyName("value")]
        public bool Value { get; set; }

        /// <summary>
        /// Whether this external alarm is currently disabled
        /// </summary>
        /// <example>false</example>
        [JsonPropertyName("isDisabled")]
        public bool IsDisabled { get; set; }
    }
}
