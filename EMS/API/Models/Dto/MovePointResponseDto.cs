namespace API.Models.Dto;

/// <summary>
/// Response model for moving a monitoring point to a different group
/// </summary>
public class MovePointResponseDto
{
    /// <summary>
    /// Indicates whether the move operation was successful
    /// </summary>
    /// <example>true</example>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// Optional message providing details about the operation result
    /// </summary>
    /// <example>Point moved successfully to the target group</example>
    public string? Message { get; set; }
}