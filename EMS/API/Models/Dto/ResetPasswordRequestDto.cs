using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for resetting a user's password.
/// </summary>
public class ResetPasswordRequestDto
{
    /// <summary>
    /// The username of the account to reset the password for.
    /// </summary>
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string UserName { get; set; } = string.Empty;
}
