namespace API.Models.Dto;

/// <summary>
/// Response DTO containing list of timeout memory configurations
/// </summary>
public class GetTimeoutMemoriesResponseDto
{
    /// <summary>
    /// List of timeout memory configurations
    /// </summary>
    public List<TimeoutMemory> TimeoutMemories { get; set; } = [];

    /// <summary>
    /// Represents a timeout memory configuration
    /// </summary>
    public class TimeoutMemory
    {
        /// <summary>
        /// Unique identifier of the timeout memory
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// ID of the monitoring item to watch for timeout (input)
        /// Can be DigitalInput, DigitalOutput, AnalogInput, or AnalogOutput
        /// </summary>
        public Guid InputItemId { get; set; }

        /// <summary>
        /// ID of the monitoring item to write timeout status (output)
        /// Should be DigitalInput or DigitalOutput
        /// </summary>
        public Guid OutputItemId { get; set; }

        /// <summary>
        /// Timeout duration in seconds
        /// </summary>
        public long Timeout { get; set; }
    }
}
