namespace API.Models.Dto;

/// <summary>
/// Response DTO containing list of comparison memory configurations
/// </summary>
public class GetComparisonMemoriesResponseDto
{
    /// <summary>
    /// Indicates if the operation was successful
    /// </summary>
    public bool IsSuccessful { get; set; } = true;

    /// <summary>
    /// Error message if operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// List of comparison memory configurations
    /// </summary>
    public List<ComparisonMemory>? ComparisonMemories { get; set; } = [];

    /// <summary>
    /// Represents a comparison memory configuration
    /// </summary>
    public class ComparisonMemory
    {
        /// <summary>
        /// Unique identifier
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Optional name for this configuration
        /// </summary>
        public string? Name { get; set; }

        /// <summary>
        /// JSON array of comparison groups
        /// </summary>
        public string ComparisonGroups { get; set; } = "[]";

        /// <summary>
        /// Operator used to combine group results (1=AND, 2=OR, 3=XOR)
        /// </summary>
        public int GroupOperator { get; set; }

        /// <summary>
        /// Output item ID (must be DigitalOutput)
        /// </summary>
        public Guid OutputItemId { get; set; }

        /// <summary>
        /// Processing interval in seconds
        /// </summary>
        public int Interval { get; set; }

        /// <summary>
        /// Whether this configuration is disabled
        /// </summary>
        public bool IsDisabled { get; set; }

        /// <summary>
        /// Whether to invert the final output
        /// </summary>
        public bool InvertOutput { get; set; }

        /// <summary>
        /// Write duration in seconds for controller writes. Default: 10
        /// </summary>
        public long Duration { get; set; }
    }
}
