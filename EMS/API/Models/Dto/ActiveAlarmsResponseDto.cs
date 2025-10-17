namespace API.Models.Dto;

/// <summary>
/// Response model containing active alarms information
/// </summary>
public class ActiveAlarmsResponseDto
{
    /// <summary>
    /// List of currently active alarms
    /// </summary>
    public List<ActiveAlarm> Data { get; set; } = new();

    /// <summary>
    /// Represents an active alarm in the system
    /// </summary>
    public class ActiveAlarm
    {
        /// <summary>
        /// Unique identifier for this active alarm instance
        /// </summary>
        /// <example>1fa85f64-5717-4562-b3fc-2c963f66afa6</example>
        public string Id { get; set; } = string.Empty;

        /// <summary>
        /// ID of the alarm configuration that triggered
        /// </summary>
        /// <example>2fa85f64-5717-4562-b3fc-2c963f66afa6</example>
        public string AlarmId { get; set; } = string.Empty;

        /// <summary>
        /// ID of the monitoring item that triggered the alarm
        /// </summary>
        /// <example>3fa85f64-5717-4562-b3fc-2c963f66afa6</example>
        public string ItemId { get; set; } = string.Empty;

        /// <summary>
        /// Unix timestamp (epoch seconds) when the alarm was triggered
        /// </summary>
        /// <example>1729180800</example>
        public long Time { get; set; }

        /// <summary>
        /// Alarm trigger time converted to local DateTime
        /// </summary>
        public DateTime DateTime
        {
            get
            {
                DateTimeOffset dateTimeOffset = DateTimeOffset.FromUnixTimeSeconds(Time);
                DateTime localDateTime = dateTimeOffset.LocalDateTime;
                return localDateTime;
            }
        }
    }
}