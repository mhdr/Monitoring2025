namespace API.Models.Dto;

/// <summary>
/// Request DTO for deleting a global variable
/// </summary>
public class DeleteGlobalVariableRequestDto
{
    /// <summary>
    /// Variable ID to delete
    /// </summary>
    public Guid Id { get; set; }
}
