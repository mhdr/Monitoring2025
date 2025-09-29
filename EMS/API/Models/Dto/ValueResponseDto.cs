namespace API.Models.Dto;

/// <summary>
/// Response wrapper containing the current value for a single monitoring item
/// </summary>
public class ValueResponseDto
{
    /// <summary>
    /// The value object for the requested item
    /// </summary>
    public SingleValue Value { get; set; } = new();

    /// <summary>
    /// Represents a single monitoring item value with timestamp information
    /// </summary>
    public class SingleValue
    {
        /// <summary>
        /// Monitoring item identifier (GUID as string)
        /// </summary>
        public string ItemId { get; set; } = string.Empty;

        /// <summary>
        /// Current value (raw stored value)
        /// </summary>
        public string Value { get; set; } = string.Empty;

        /// <summary>
        /// Unix epoch seconds when the value was recorded
        /// </summary>
        public long Time { get; set; }

        /// <summary>
        /// Convenience DateTime (local) converted from <see cref="Time"/>
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