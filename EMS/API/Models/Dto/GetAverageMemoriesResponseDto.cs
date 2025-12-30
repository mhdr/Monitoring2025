namespace API.Models.Dto;

/// <summary>
/// Response DTO containing list of average memory configurations
/// </summary>
public class GetAverageMemoriesResponseDto
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
    /// List of average memory configurations
    /// </summary>
    public List<AverageMemory>? AverageMemories { get; set; } = [];

    /// <summary>
    /// Represents an average memory configuration
    /// </summary>
    public class AverageMemory
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
        /// JSON array of input item IDs
        /// </summary>
        public string InputItemIds { get; set; } = "[]";

        /// <summary>
        /// Output item ID
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
        /// Optional JSON array of weights
        /// </summary>
        public string? Weights { get; set; }

        /// <summary>
        /// Whether to ignore stale inputs
        /// </summary>
        public bool IgnoreStale { get; set; }

        /// <summary>
        /// Stale timeout in seconds
        /// </summary>
        public long StaleTimeout { get; set; }

        /// <summary>
        /// Whether outlier detection is enabled
        /// </summary>
        public bool EnableOutlierDetection { get; set; }

        /// <summary>
        /// Outlier detection method (0=None, 1=IQR, 2=ZScore)
        /// </summary>
        public int OutlierMethod { get; set; }

        /// <summary>
        /// Outlier threshold value
        /// </summary>
        public double OutlierThreshold { get; set; }

        /// <summary>
        /// Minimum number of inputs required
        /// </summary>
        public int MinimumInputs { get; set; }
    }
}
