namespace API.Models.Dto;

/// <summary>
/// Response model for write or add value operation
/// </summary>
public class WriteOrAddValueResponseDto
{
    /// <summary>
    /// Indicates whether the write or add operation was successful
    /// </summary>
    /// <example>true</example>
    public bool IsSuccess { get; set; }
}