namespace API.Models.Dto;

/// <summary>
/// Response model containing historical alarm data
/// </summary>
public class AlarmHistoryResponseDto
{
    /// <summary>
    /// List of historical alarm events
    /// </summary>
    public List<AlarmHistory> Data { get; set; }

    /// <summary>
    /// Initializes a new instance of AlarmHistoryResponseDto
    /// </summary>
    public AlarmHistoryResponseDto()
    {
        Data = new();
    }

    /// <summary>
    /// Represents a single historical alarm event
    /// </summary>
    public class AlarmHistory
    {
        /// <summary>
        /// Unique identifier of the alarm history record
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440000</example>
        public string Id { get; set; } = string.Empty;
        
        /// <summary>
        /// Identifier of the alarm configuration that triggered this event
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440001</example>
        public string AlarmId { get; set; } = string.Empty;
        
        /// <summary>
        /// Identifier of the monitoring item associated with this alarm
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440002</example>
        public string ItemId { get; set; } = string.Empty;
        
        /// <summary>
        /// Time of the alarm event as Unix timestamp (seconds since epoch)
        /// </summary>
        /// <example>1697587200</example>
        public long Time { get; set; }
        
        /// <summary>
        /// Indicates whether the alarm was active (true) or cleared (false) at this time
        /// </summary>
        /// <example>true</example>
        public bool IsActive { get; set; }
        
        /// <summary>
        /// Optional alarm log message or description
        /// </summary>
        /// <example>Temperature exceeded threshold</example>
        public string? AlarmLog { get; set; }

        /// <summary>
        /// Converts the Unix timestamp to local DateTime for convenience
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