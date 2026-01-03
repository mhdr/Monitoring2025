namespace API.Models.Dto;

/// <summary>
/// Response DTO containing list of global variables with their current values
/// </summary>
public class GetGlobalVariablesResponseDto
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
    /// List of global variables
    /// </summary>
    public List<GlobalVariable>? GlobalVariables { get; set; } = [];

    /// <summary>
    /// Represents a global variable with its current value
    /// </summary>
    public class GlobalVariable
    {
        /// <summary>
        /// Unique identifier
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Variable name (unique across system)
        /// </summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Variable type (0=Boolean, 1=Float)
        /// </summary>
        public int VariableType { get; set; }

        /// <summary>
        /// Optional description
        /// </summary>
        public string? Description { get; set; }

        /// <summary>
        /// Whether this variable is disabled
        /// </summary>
        public bool IsDisabled { get; set; }

        /// <summary>
        /// Current value (string representation: "true"/"false" for boolean, numeric for float)
        /// </summary>
        public string CurrentValue { get; set; } = string.Empty;

        /// <summary>
        /// Unix timestamp (milliseconds) when value was last updated
        /// </summary>
        public long LastUpdateTime { get; set; }

        /// <summary>
        /// When the variable was created (UTC)
        /// </summary>
        public DateTime CreatedAt { get; set; }

        /// <summary>
        /// When the variable configuration was last updated (UTC)
        /// </summary>
        public DateTime UpdatedAt { get; set; }
    }
}
