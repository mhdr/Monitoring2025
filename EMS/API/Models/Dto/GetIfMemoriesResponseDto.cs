namespace API.Models.Dto;

/// <summary>
/// Response DTO containing list of IF memory configurations
/// </summary>
public class GetIfMemoriesResponseDto
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
    /// List of IF memory configurations
    /// </summary>
    public List<IfMemory>? IfMemories { get; set; } = [];

    /// <summary>
    /// Represents an IF memory configuration
    /// </summary>
    public class IfMemory
    {
        /// <summary>
        /// Unique identifier
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Optional name/description for this IF memory configuration
        /// </summary>
        public string? Name { get; set; }

        /// <summary>
        /// JSON array of conditional branches evaluated in order
        /// </summary>
        public string Branches { get; set; } = "[]";

        /// <summary>
        /// Default output value when no branch condition matches
        /// </summary>
        public double DefaultValue { get; set; }

        /// <summary>
        /// JSON object mapping variable aliases to input item GUIDs
        /// </summary>
        public string VariableAliases { get; set; } = "{}";

        /// <summary>
        /// Output item ID that receives the computed result
        /// </summary>
        public Guid OutputItemId { get; set; }

        /// <summary>
        /// Output type: 1=Digital, 2=Analog
        /// </summary>
        public int OutputType { get; set; }

        /// <summary>
        /// Processing interval in seconds
        /// </summary>
        public int Interval { get; set; }

        /// <summary>
        /// If true, this IF memory is disabled
        /// </summary>
        public bool IsDisabled { get; set; }
    }
}
