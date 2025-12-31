namespace API.Models.Dto;

/// <summary>
/// Response DTO containing list of write action memory configurations
/// </summary>
public class GetWriteActionMemoriesResponseDto
{
    /// <summary>
    /// List of write action memory configurations
    /// </summary>
    public List<WriteActionMemory> WriteActionMemories { get; set; } = [];

    /// <summary>
    /// Represents a write action memory configuration
    /// </summary>
    public class WriteActionMemory
    {
        /// <summary>
        /// Unique identifier of the write action memory
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Optional name for the write action memory
        /// </summary>
        public string? Name { get; set; }

        /// <summary>
        /// ID of the monitoring item to watch (input)
        /// Can be any item type (DigitalInput, DigitalOutput, AnalogInput, AnalogOutput)
        /// </summary>
        public Guid InputItemId { get; set; }

        /// <summary>
        /// ID of the monitoring item to write values (output)
        /// Must be DigitalOutput or AnalogOutput
        /// </summary>
        public Guid OutputItemId { get; set; }

        /// <summary>
        /// Static value to write (used when OutputValueSourceItemId is null)
        /// </summary>
        public string? OutputValue { get; set; }

        /// <summary>
        /// ID of the item to read dynamic value from (used when OutputValue is null)
        /// </summary>
        public Guid? OutputValueSourceItemId { get; set; }

        /// <summary>
        /// Interval in seconds between write actions (must be greater than 0)
        /// </summary>
        public int Interval { get; set; }

        /// <summary>
        /// Duration parameter for WriteOrAddValue (must be >= 0)
        /// </summary>
        public long Duration { get; set; }

        /// <summary>
        /// Maximum number of times to execute the write action (null = continuous/unlimited)
        /// </summary>
        public int? MaxExecutionCount { get; set; }

        /// <summary>
        /// Current count of executed write actions
        /// </summary>
        public int CurrentExecutionCount { get; set; }

        /// <summary>
        /// Indicates whether this write action memory is disabled
        /// </summary>
        public bool IsDisabled { get; set; }
    }
}
