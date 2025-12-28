namespace API.Models.Dto;

/// <summary>
/// Response DTO containing list of potential parent PIDs for cascade control
/// </summary>
public class GetPotentialParentPIDsResponseDto
{
    /// <summary>
    /// List of PIDs that can serve as parent controllers
    /// </summary>
    public List<ParentPID> PotentialParents { get; set; } = [];

    /// <summary>
    /// Represents a potential parent PID
    /// </summary>
    public class ParentPID
    {
        /// <summary>
        /// Unique identifier of the PID
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Human-readable name of the PID controller
        /// </summary>
        public string? Name { get; set; }

        /// <summary>
        /// Output item ID (will become setpoint for child PID)
        /// </summary>
        public Guid OutputItemId { get; set; }

        /// <summary>
        /// Cascade level of this PID
        /// </summary>
        public int CascadeLevel { get; set; }

        /// <summary>
        /// Whether the PID is disabled
        /// </summary>
        public bool IsDisabled { get; set; }
    }
}
