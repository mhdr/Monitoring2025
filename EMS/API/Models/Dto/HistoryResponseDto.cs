namespace API.Models.Dto;

/// <summary>
/// Response DTO containing historical data for monitoring items
/// </summary>
public class HistoryResponseDto
{
    /// <summary>
    /// List of historical data points with values and timestamps
    /// </summary>
    public List<Data> Values { get; set; }

    public HistoryResponseDto()
    {
        Values = new();
    }

    /// <summary>
    /// Represents a single historical data point
    /// </summary>
    public class Data
    {
        /// <summary>
        /// The historical value as a string
        /// </summary>
        public string Value { get; set; }

        /// <summary>
        /// Unix timestamp when the value was recorded
        /// </summary>
        public long Time { get; set; }

        /// <summary>
        /// Timestamp converted to local DateTime
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