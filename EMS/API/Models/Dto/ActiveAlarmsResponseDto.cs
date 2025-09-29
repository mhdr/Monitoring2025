namespace API.Models.Dto;

/// <summary>
/// Response DTO containing active alarms information
/// </summary>
public class ActiveAlarmsResponseDto
{
    /// <summary>
    /// List of currently active alarms
    /// </summary>
    public List<ActiveAlarm> Data { get; set; }

    public ActiveAlarmsResponseDto()
    {
        Data = new();
    }

    /// <summary>
    /// Represents an active alarm in the system
    /// </summary>
    public class ActiveAlarm
    {
        /// <summary>
        /// Unique identifier for this active alarm instance
        /// </summary>
        public string Id { get; set; }

        /// <summary>
        /// ID of the alarm configuration that triggered
        /// </summary>
        public string AlarmId { get; set; }

        /// <summary>
        /// ID of the monitoring item that triggered the alarm
        /// </summary>
        public string ItemId { get; set; }

        /// <summary>
        /// Unix timestamp when the alarm was triggered
        /// </summary>
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