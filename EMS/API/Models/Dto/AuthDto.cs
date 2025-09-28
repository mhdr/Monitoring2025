using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// User registration request DTO
/// </summary>
public class RegisterRequestDto
{
    /// <summary>
    /// User's first name
    /// </summary>
    [Required]
    [StringLength(50)]
    public string FirstName { get; set; } = string.Empty;

    /// <summary>
    /// User's last name
    /// </summary>
    [Required]
    [StringLength(50)]
    public string LastName { get; set; } = string.Empty;

    /// <summary>
    /// User's first name in Farsi
    /// </summary>
    [Required]
    [StringLength(50)]
    public string FirstNameFa { get; set; } = string.Empty;

    /// <summary>
    /// User's last name in Farsi
    /// </summary>
    [Required]
    [StringLength(50)]
    public string LastNameFa { get; set; } = string.Empty;

    /// <summary>
    /// Username
    /// </summary>
    [Required]
    [StringLength(50)]
    public string UserName { get; set; } = string.Empty;

    /// <summary>
    /// User's password
    /// </summary>
    [Required]
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// Confirm password
    /// </summary>
    [Required]
    [Compare("Password")]
    public string ConfirmPassword { get; set; } = string.Empty;
}

/// <summary>
/// User login request DTO
/// </summary>
public class LoginRequestDto
{
    /// <summary>
    /// Username for login
    /// </summary>
    [Required]
    public string UserName { get; set; } = string.Empty;

    /// <summary>
    /// User's password
    /// </summary>
    [Required]
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// Remember me flag for extended token expiry
    /// </summary>
    public bool RememberMe { get; set; } = false;
}

/// <summary>
/// Refresh token request DTO
/// </summary>
public class RefreshTokenRequestDto
{
    /// <summary>
    /// Access token
    /// </summary>
    [Required]
    public string AccessToken { get; set; } = string.Empty;

    /// <summary>
    /// Refresh token
    /// </summary>
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}

/// <summary>
/// Authentication response DTO
/// </summary>
public class AuthResponseDto
{
    /// <summary>
    /// JWT access token
    /// </summary>
    public string AccessToken { get; set; } = string.Empty;

    /// <summary>
    /// Refresh token
    /// </summary>
    public string RefreshToken { get; set; } = string.Empty;

    /// <summary>
    /// Token expiry time
    /// </summary>
    public DateTime Expires { get; set; }

    /// <summary>
    /// User information
    /// </summary>
    public UserInfoDto User { get; set; } = new();

    /// <summary>
    /// Indicates if authentication was successful
    /// </summary>
    public bool Success { get; set; } = true;

    /// <summary>
    /// Error message if authentication failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// User information DTO
/// </summary>
public class UserInfoDto
{
    /// <summary>
    /// User ID
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Username
    /// </summary>
    public string UserName { get; set; } = string.Empty;

    /// <summary>
    /// First name
    /// </summary>
    public string FirstName { get; set; } = string.Empty;

    /// <summary>
    /// Last name
    /// </summary>
    public string LastName { get; set; } = string.Empty;

    /// <summary>
    /// First name in Farsi
    /// </summary>
    public string FirstNameFa { get; set; } = string.Empty;

    /// <summary>
    /// Last name in Farsi
    /// </summary>
    public string LastNameFa { get; set; } = string.Empty;

    /// <summary>
    /// User roles
    /// </summary>
    public IList<string> Roles { get; set; } = new List<string>();

    /// <summary>
    /// Whether user account is disabled/locked
    /// </summary>
    public bool IsDisabled { get; set; } = false;
}

/// <summary>
/// Update user information request DTO
/// </summary>
public class UpdateUserRequestDto
{
    /// <summary>
    /// User's first name
    /// </summary>
    [StringLength(50)]
    public string? FirstName { get; set; }

    /// <summary>
    /// User's last name
    /// </summary>
    [StringLength(50)]
    public string? LastName { get; set; }

    /// <summary>
    /// User's first name in Farsi
    /// </summary>
    [StringLength(50)]
    public string? FirstNameFa { get; set; }

    /// <summary>
    /// User's last name in Farsi
    /// </summary>
    [StringLength(50)]
    public string? LastNameFa { get; set; }
}

/// <summary>
/// Disable/Enable user request DTO
/// </summary>
public class DisableUserRequestDto
{
    /// <summary>
    /// User ID to disable/enable
    /// </summary>
    [Required]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// Whether to disable (true) or enable (false) the user
    /// </summary>
    public bool Disable { get; set; } = true;

    /// <summary>
    /// Optional reason for disabling the user
    /// </summary>
    [StringLength(500)]
    public string? Reason { get; set; }
}

/// <summary>
/// Generic response DTO for operations
/// </summary>
public class OperationResponseDto
{
    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool Success { get; set; } = true;

    /// <summary>
    /// Success or error message
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Additional data if needed
    /// </summary>
    public object? Data { get; set; }
}