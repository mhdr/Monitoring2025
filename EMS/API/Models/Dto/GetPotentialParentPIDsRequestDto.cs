namespace API.Models.Dto;

/// <summary>
/// Request DTO for getting potential parent PIDs for cascade control
/// </summary>
public class GetPotentialParentPIDsRequestDto
{
    /// <summary>
    /// Current PID ID (optional, used to exclude self from results)
    /// </summary>
    public Guid? CurrentPidId { get; set; }

    /// <summary>
    /// Desired cascade level for the child PID (1 or 2)
    /// Parent PIDs will have cascade level = DesiredCascadeLevel - 1
    /// </summary>
    public int DesiredCascadeLevel { get; set; } = 1;
}
