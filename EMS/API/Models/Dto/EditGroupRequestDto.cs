namespace API.Models.Dto;

/// <summary>
/// Request DTO for editing an existing monitoring group
/// </summary>
public class EditGroupRequestDto
{
    /// <summary>
    /// Unique identifier of the group to edit
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// New name for the monitoring group
    /// </summary>
    public string Name { get; set; }
}