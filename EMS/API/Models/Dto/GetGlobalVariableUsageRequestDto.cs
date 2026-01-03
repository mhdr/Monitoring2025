namespace API.Models.Dto;

/// <summary>
/// Request DTO for getting global variable usage information
/// </summary>
public class GetGlobalVariableUsageRequestDto
{
    /// <summary>
    /// Variable ID to find usage for
    /// </summary>
    public Guid Id { get; set; }
}
