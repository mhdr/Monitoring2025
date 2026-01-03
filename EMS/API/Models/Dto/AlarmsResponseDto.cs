using System.ComponentModel.DataAnnotations;
using Share.Libs;

namespace API.Models.Dto;

/// <summary>
/// Response DTO containing alarm configurations for monitoring items
/// </summary>
/// <example>
/// {
///   "data": [
///     {
///       "id": "550e8400-e29b-41d4-a716-446655440000",
///       "itemId": "550e8400-e29b-41d4-a716-446655440001",
///       "alarmType": 1,
///       "alarmPriority": 2,
///       "compareType": 0,
///       "isDisabled": false,
///       "alarmDelay": 30,
///       "message": "Temperature too high",
///       "messageFa": "دمای بیش از حد بالا",
///       "value1": "75.5",
///       "value2": "85.0",
///       "timeout": 3600,
///       "hasExternalAlarm": true
///     }
///   ]
/// }
/// </example>
public class AlarmsResponseDto
{
    /// <summary>
    /// List of alarm configurations
    /// </summary>
    /// <example>
    /// See class example above
    /// </example>
    public List<Alarm> Data { get; set; }

    /// <summary>
    /// Initializes a new instance of the AlarmsResponseDto
    /// </summary>
    public AlarmsResponseDto()
    {
        Data = new();
    }

    /// <summary>
    /// Represents an alarm configuration for a monitoring item
    /// </summary>
    public class Alarm
    {
        /// <summary>
        /// Unique identifier for the alarm
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440000</example>
        public required string Id { get; set; }

        /// <summary>
        /// ID of the monitoring item this alarm is configured for
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440001</example>
        public required string ItemId { get; set; }

        /// <summary>
        /// Type of alarm (High, Low, Critical, etc.)
        /// </summary>
        public AlarmType AlarmType { get; set; }

        /// <summary>
        /// Priority level of the alarm
        /// </summary>
        public AlarmPriority AlarmPriority { get; set; }

        /// <summary>
        /// Comparison operation for triggering the alarm
        /// </summary>
        public CompareType CompareType { get; set; }

        /// <summary>
        /// Whether the alarm is disabled
        /// </summary>
        /// <example>false</example>
        public bool IsDisabled { get; set; }

        /// <summary>
        /// Delay in seconds before the alarm triggers after condition is met
        /// </summary>
        /// <example>30</example>
        public int AlarmDelay { get; set; }

        /// <summary>
        /// Custom message to display when alarm triggers
        /// </summary>
        /// <example>Temperature too high</example>
        public string? Message { get; set; }
        
        /// <summary>
        /// Custom message to display when alarm triggers in Farsi
        /// </summary>
        /// <example>Temperature too high</example>
        public string? MessageFa { get; set; }

        /// <summary>
        /// First comparison value (threshold, setpoint, etc.)
        /// </summary>
        /// <example>75.5</example>
        public string? Value1 { get; set; }

        /// <summary>
        /// Second comparison value for range-based alarms
        /// </summary>
        /// <example>85.0</example>
        public string? Value2 { get; set; }

        /// <summary>
        /// Timeout in seconds for alarm acknowledgment
        /// </summary>
        /// <example>3600</example>
        public int? Timeout { get; set; }

        /// <summary>
        /// Whether this alarm has an external alarm configuration
        /// </summary>
        /// <example>true</example>
        public bool? HasExternalAlarm { get; set; }
    }
}