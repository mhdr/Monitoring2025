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
        /// Type of the input source: 0=Point, 1=GlobalVariable
        /// </summary>
        public int InputType { get; set; }

        /// <summary>
        /// Reference to the input source (GUID string for Point, name for GlobalVariable)
        /// </summary>
        public string InputReference { get; set; } = string.Empty;

        /// <summary>
        /// Type of the output source: 0=Point, 1=GlobalVariable
        /// </summary>
        public int OutputType { get; set; }

        /// <summary>
        /// Reference to the output source (GUID string for Point, name for GlobalVariable)
        /// </summary>
        public string OutputReference { get; set; } = string.Empty;

        /// <summary>
        /// Timeout duration in seconds
        /// </summary>
        public long Timeout { get; set; }
    }
}
