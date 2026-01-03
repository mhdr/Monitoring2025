namespace API.Models.Dto;

/// <summary>
/// Response DTO containing global variable usage information
/// </summary>
public class GetGlobalVariableUsageResponseDto
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
    /// Variable name
    /// </summary>
    public string? VariableName { get; set; }

    /// <summary>
    /// List of memories using this variable
    /// </summary>
    public List<MemoryUsage>? Usages { get; set; } = [];

    /// <summary>
    /// Represents a memory that uses this global variable
    /// </summary>
    public class MemoryUsage
    {
        /// <summary>
        /// Memory ID
        /// </summary>
        public Guid MemoryId { get; set; }

        /// <summary>
        /// Memory type (e.g., "FormulaMemory", "IfMemory", "AverageMemory")
        /// </summary>
        public string MemoryType { get; set; } = string.Empty;

        /// <summary>
        /// Memory name (if available)
        /// </summary>
        public string? MemoryName { get; set; }

        /// <summary>
        /// Usage context (e.g., "Input", "Output", "Condition")
        /// </summary>
        public string UsageContext { get; set; } = string.Empty;
    }
}
