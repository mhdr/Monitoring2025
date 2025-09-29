namespace API.Models.Dto;

/// <summary>
/// Request DTO for adding a new monitoring group
/// </summary>
public class AddGroupRequestDto
{
    /// <summary>
    /// Name of the monitoring group
    /// </summary>
    public string Name { get; set; }

    /// <summary>
    /// ID of the parent group for hierarchical organization. Null for root-level groups.
    /// </summary>
    public Guid? ParentId { get; set; }
}