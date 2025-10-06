using System.Collections.Generic;

namespace API.Models.Dto;

/// <summary>
/// Response DTO for the reset password operation.
/// </summary>
public class ResetPasswordResponseDto
{
    /// <summary>
    /// Indicates whether the password reset operation succeeded.
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// Optional human-readable message describing the result.
    /// </summary>
    public string? Message { get; set; }

    /// <summary>
    /// Optional list of error details when the operation failed.
    /// </summary>
    public List<string>? Errors { get; set; }
}