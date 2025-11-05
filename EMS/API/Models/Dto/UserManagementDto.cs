using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for getting list of users with optional filtering
/// </summary>
public class GetUsersRequestDto
{
    /// <summary>
    /// Optional search term to filter users by username or name
    /// </summary>
    [StringLength(100)]
    public string? SearchTerm { get; set; }

    /// <summary>
    /// Optional role filter to get users with specific role
    /// </summary>
    [StringLength(50)]
    public string? Role { get; set; }

    /// <summary>
    /// Include disabled/locked users in results (default: true)
    /// </summary>
    public bool IncludeDisabled { get; set; } = true;

    /// <summary>
    /// Page number for pagination (1-based, default: 1)
    /// </summary>
    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    /// <summary>
    /// Page size for pagination (default: 50, max: 500)
    /// </summary>
    [Range(1, 500)]
    public int PageSize { get; set; } = 50;
}

/// <summary>
/// Response DTO for getting list of users
/// </summary>
public class GetUsersResponseDto
{
    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool Success { get; set; } = true;

    /// <summary>
    /// List of users
    /// </summary>
    public List<UserInfoDto> Users { get; set; } = new();

    /// <summary>
    /// Total count of users (before pagination)
    /// </summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// Current page number
    /// </summary>
    public int Page { get; set; }

    /// <summary>
    /// Page size
    /// </summary>
    public int PageSize { get; set; }

    /// <summary>
    /// Total number of pages
    /// </summary>
    public int TotalPages { get; set; }

    /// <summary>
    /// Error message if operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// Request DTO for getting a single user by ID
/// </summary>
public class GetUserRequestDto
{
    /// <summary>
    /// User ID to retrieve
    /// </summary>
    [Required(ErrorMessage = "User ID is required")]
    public string UserId { get; set; } = string.Empty;
}

/// <summary>
/// Response DTO for getting a single user
/// </summary>
public class GetUserResponseDto
{
    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool Success { get; set; } = true;

    /// <summary>
    /// User information
    /// </summary>
    public UserInfoDto? User { get; set; }

    /// <summary>
    /// Error message if operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// Request DTO for editing a user's information
/// </summary>
public class EditUserRequestDto
{
    /// <summary>
    /// User ID to edit
    /// </summary>
    [Required(ErrorMessage = "User ID is required")]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// User's first name
    /// </summary>
    [Required(ErrorMessage = "First name is required")]
    [StringLength(50, MinimumLength = 1, ErrorMessage = "First name must be 1-50 characters")]
    public string FirstName { get; set; } = string.Empty;

    /// <summary>
    /// User's last name
    /// </summary>
    [Required(ErrorMessage = "Last name is required")]
    [StringLength(50, MinimumLength = 1, ErrorMessage = "Last name must be 1-50 characters")]
    public string LastName { get; set; } = string.Empty;

    /// <summary>
    /// User's first name in Farsi
    /// </summary>
    [StringLength(50, ErrorMessage = "First name (Farsi) must be at most 50 characters")]
    public string? FirstNameFa { get; set; }

    /// <summary>
    /// User's last name in Farsi
    /// </summary>
    [StringLength(50, ErrorMessage = "Last name (Farsi) must be at most 50 characters")]
    public string? LastNameFa { get; set; }

    /// <summary>
    /// Username (cannot be changed if already exists)
    /// </summary>
    [Required(ErrorMessage = "Username is required")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "Username must be 3-50 characters")]
    public string UserName { get; set; } = string.Empty;
}

/// <summary>
/// Response DTO for editing a user
/// </summary>
public class EditUserResponseDto
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
    /// Updated user information
    /// </summary>
    public UserInfoDto? User { get; set; }
}

/// <summary>
/// Request DTO for deleting a user
/// </summary>
public class DeleteUserRequestDto
{
    /// <summary>
    /// User ID to delete
    /// </summary>
    [Required(ErrorMessage = "User ID is required")]
    public string UserId { get; set; } = string.Empty;
}

/// <summary>
/// Response DTO for deleting a user
/// </summary>
public class DeleteUserResponseDto
{
    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool Success { get; set; } = true;

    /// <summary>
    /// Success or error message
    /// </summary>
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// Response DTO for getting all available roles
/// </summary>
public class GetRolesResponseDto
{
    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool Success { get; set; } = true;

    /// <summary>
    /// List of available roles
    /// </summary>
    public List<RoleInfoDto> Roles { get; set; } = new();

    /// <summary>
    /// Error message if operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// Role information DTO
/// </summary>
public class RoleInfoDto
{
    /// <summary>
    /// Role ID
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Role name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Number of users with this role
    /// </summary>
    public int UserCount { get; set; }
}

/// <summary>
/// Request DTO for updating a user's roles
/// </summary>
public class UpdateUserRolesRequestDto
{
    /// <summary>
    /// User ID to update roles for
    /// </summary>
    [Required(ErrorMessage = "User ID is required")]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// List of role names to assign to the user (replaces existing roles)
    /// </summary>
    [Required(ErrorMessage = "Roles list is required")]
    public List<string> Roles { get; set; } = new();
}

/// <summary>
/// Response DTO for updating user roles
/// </summary>
public class UpdateUserRolesResponseDto
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
    /// Updated list of user's roles
    /// </summary>
    public List<string> Roles { get; set; } = new();
}

/// <summary>
/// Request DTO for setting a new password for a user (admin only)
/// </summary>
public class SetUserPasswordRequestDto
{
    /// <summary>
    /// User ID to set password for
    /// </summary>
    [Required(ErrorMessage = "User ID is required")]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// New password
    /// </summary>
    [Required(ErrorMessage = "New password is required")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "Password must be at least 6 characters")]
    public string NewPassword { get; set; } = string.Empty;
}

/// <summary>
/// Response DTO for setting user password
/// </summary>
public class SetUserPasswordResponseDto
{
    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool Success { get; set; } = true;

    /// <summary>
    /// Success or error message
    /// </summary>
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// Request DTO for toggling user enabled/disabled status
/// </summary>
public class ToggleUserStatusRequestDto
{
    /// <summary>
    /// User ID to toggle status for
    /// </summary>
    [Required(ErrorMessage = "User ID is required")]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// Whether to disable (true) or enable (false) the user
    /// </summary>
    public bool Disable { get; set; } = true;
}

/// <summary>
/// Response DTO for toggling user status
/// </summary>
public class ToggleUserStatusResponseDto
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
    /// Current user status
    /// </summary>
    public bool IsDisabled { get; set; }
}
