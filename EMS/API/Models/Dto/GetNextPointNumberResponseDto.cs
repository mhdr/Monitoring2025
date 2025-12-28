namespace API.Models.Dto;

/// <summary>
/// Response DTO for getting the next available point number
/// </summary>
public class GetNextPointNumberResponseDto
{
    /// <summary>
    /// Indicates if the operation was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The next available point number (max point number + 1)
    /// </summary>
    public int NextPointNumber { get; set; }

    /// <summary>
    /// Optional message providing additional context
    /// </summary>
    public string? Message { get; set; }
}
