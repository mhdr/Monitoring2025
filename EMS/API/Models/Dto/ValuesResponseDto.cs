using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Response DTO containing current values of monitoring items
/// </summary>
public class ValuesResponseDto
{
    /// <summary>
    /// List of current values for the requested monitoring items
    /// </summary>
    public List<MultiValue> Values { get; set; }

    /// <summary>
    /// Initializes a new instance of the ValuesResponseDto
    /// </summary>
    public ValuesResponseDto()
    {
        Values = new();
    }

    /// <summary>
    /// Represents a current value for a monitoring item
    /// </summary>
    public class MultiValue
    {
        /// <summary>
        /// ID of the monitoring item this value belongs to
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440000</example>
        public required string ItemId { get; set; }

        /// <summary>
        /// Current value as a string (supports numeric and text values)
        /// </summary>
        /// <example>25.6</example>
        public required string Value { get; set; }

        /// <summary>
        /// Unix timestamp when this value was recorded
        /// </summary>
        /// <example>1672531200</example>
        public long Time { get; set; }

        /// <summary>
        /// DateTime representation of the timestamp in local time
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