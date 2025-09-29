namespace API.Models.Dto;

/// <summary>
/// Request DTO for changing user password
/// </summary>
public class ChangePasswordRequestDto
{
    /// <summary>
    /// User's current password for verification
    /// </summary>
    public string CurrentPassword { get; set; } = string.Empty;

    /// <summary>
    /// New password to set
    /// </summary>
    public string NewPassword { get; set; } = string.Empty;
}