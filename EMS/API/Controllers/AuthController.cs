using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authorization;
using API.Models.Dto;
using API.Services;
using DB.User.Models;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

/// <summary>
/// Authentication controller for user login, registration, and token management
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly ILogger<AuthController> _logger;

    /// <summary>
    /// Initializes a new instance of the AuthController
    /// </summary>
    /// <param name="userManager">The user manager service</param>
    /// <param name="signInManager">The sign-in manager service</param>
    /// <param name="roleManager">The role manager service</param>
    /// <param name="jwtTokenService">The JWT token service</param>
    /// <param name="logger">The logger service</param>
    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        RoleManager<IdentityRole> roleManager,
        IJwtTokenService jwtTokenService,
        ILogger<AuthController> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _roleManager = roleManager;
        _jwtTokenService = jwtTokenService;
        _logger = logger;
    }

    /// <summary>
    /// Register a new user
    /// </summary>
    /// <param name="request">Registration request containing user information</param>
    /// <returns>Authentication response with JWT token</returns>
    /// <response code="200">Returns the user information with JWT token</response>
    /// <response code="400">If the input is invalid or user already exists</response>
    /// <response code="500">If an internal error occurs</response>
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new AuthResponseDto
                {
                    Success = false,
                    ErrorMessage = "Invalid input data"
                });
            }

            // Check if user already exists
            var existingUserByUserName = await _userManager.FindByNameAsync(request.UserName);
            if (existingUserByUserName != null)
            {
                return BadRequest(new AuthResponseDto
                {
                    Success = false,
                    ErrorMessage = "User with this username already exists"
                });
            }

            // Create new user
            var user = new ApplicationUser
            {
                UserName = request.UserName,
                FirstName = request.FirstName,
                LastName = request.LastName,
                FirstNameFa = request.FirstNameFa,
                LastNameFa = request.LastNameFa,
                EmailConfirmed = true // Not using email, but keep for compatibility
            };

            var result = await _userManager.CreateAsync(user, request.Password);

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                return BadRequest(new AuthResponseDto
                {
                    Success = false,
                    ErrorMessage = $"Failed to create user: {errors}"
                });
            }

            // Get user roles
            var roles = await _userManager.GetRolesAsync(user);

            // Generate JWT token
            var accessToken = _jwtTokenService.GenerateAccessToken(user, roles);
            var refreshToken = _jwtTokenService.GenerateRefreshToken();

            // TODO: Store refresh token in database if needed for revocation

            _logger.LogInformation("User {UserName} registered successfully", request.UserName);

            return Ok(new AuthResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                Expires = DateTime.UtcNow.AddMinutes(60), // This should match JWT config
                Success = true,
                User = new UserInfoDto
                {
                    Id = user.Id,
                    UserName = user.UserName ?? string.Empty,
                    FirstName = user.FirstName ?? string.Empty,
                    LastName = user.LastName ?? string.Empty,
                    FirstNameFa = user.FirstNameFa ?? string.Empty,
                    LastNameFa = user.LastNameFa ?? string.Empty,
                    Roles = roles,
                    IsDisabled = await _userManager.IsLockedOutAsync(user)
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during user registration");
            return StatusCode(500, new AuthResponseDto
            {
                Success = false,
                ErrorMessage = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Authenticate user and return JWT token
    /// </summary>
    /// <param name="request">Login request containing credentials</param>
    /// <returns>Authentication response with JWT token</returns>
    /// <response code="200">Returns the user information with JWT token</response>
    /// <response code="400">If the input is invalid</response>
    /// <response code="401">If the credentials are incorrect</response>
    /// <response code="500">If an internal error occurs</response>
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new AuthResponseDto
                {
                    Success = false,
                    ErrorMessage = "Invalid input data"
                });
            }

            // Find user by username
            var user = await _userManager.FindByNameAsync(request.UserName);

            if (user == null)
            {
                return Unauthorized(new AuthResponseDto
                {
                    Success = false,
                    ErrorMessage = "Invalid credentials"
                });
            }

            // Check password
            var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, false);

            if (!result.Succeeded)
            {
                _logger.LogWarning("Failed login attempt for user {UserName}", request.UserName);
                return Unauthorized(new AuthResponseDto
                {
                    Success = false,
                    ErrorMessage = "Invalid credentials"
                });
            }

            // Get user roles
            var roles = await _userManager.GetRolesAsync(user);

            // Generate JWT token
            var accessToken = _jwtTokenService.GenerateAccessToken(user, roles);
            var refreshToken = _jwtTokenService.GenerateRefreshToken();

            // TODO: Store refresh token in database if needed for revocation

            _logger.LogInformation("User {UserName} logged in successfully", user.UserName);

            return Ok(new AuthResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                Expires = DateTime.UtcNow.AddMinutes(60), // This should match JWT config
                Success = true,
                User = new UserInfoDto
                {
                    Id = user.Id,
                    UserName = user.UserName ?? string.Empty,
                    FirstName = user.FirstName ?? string.Empty,
                    LastName = user.LastName ?? string.Empty,
                    FirstNameFa = user.FirstNameFa ?? string.Empty,
                    LastNameFa = user.LastNameFa ?? string.Empty,
                    Roles = roles,
                    IsDisabled = await _userManager.IsLockedOutAsync(user)
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during user login");
            return StatusCode(500, new AuthResponseDto
            {
                Success = false,
                ErrorMessage = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Refresh JWT token using refresh token
    /// </summary>
    /// <param name="request">Refresh token request</param>
    /// <returns>New JWT token</returns>
    [HttpPost("refresh-token")]
    [ProducesResponseType(typeof(AuthResponseDto), 200)]
    [ProducesResponseType(typeof(AuthResponseDto), 400)]
    [ProducesResponseType(typeof(AuthResponseDto), 401)]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequestDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new AuthResponseDto
                {
                    Success = false,
                    ErrorMessage = "Invalid input data"
                });
            }

            var principal = _jwtTokenService.GetPrincipalFromExpiredToken(request.AccessToken);
            if (principal == null)
            {
                return Unauthorized(new AuthResponseDto
                {
                    Success = false,
                    ErrorMessage = "Invalid token"
                });
            }

            var userId = principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new AuthResponseDto
                {
                    Success = false,
                    ErrorMessage = "Invalid token"
                });
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return Unauthorized(new AuthResponseDto
                {
                    Success = false,
                    ErrorMessage = "User not found"
                });
            }

            // TODO: Validate refresh token against stored token in database

            // Get user roles
            var roles = await _userManager.GetRolesAsync(user);

            // Generate new tokens
            var newAccessToken = _jwtTokenService.GenerateAccessToken(user, roles);
            var newRefreshToken = _jwtTokenService.GenerateRefreshToken();

            _logger.LogInformation("Token refreshed for user {UserId}", userId);

            return Ok(new AuthResponseDto
            {
                AccessToken = newAccessToken,
                RefreshToken = newRefreshToken,
                Expires = DateTime.UtcNow.AddMinutes(60), // This should match JWT config
                Success = true,
                User = new UserInfoDto
                {
                    Id = user.Id,
                    UserName = user.UserName ?? string.Empty,
                    FirstName = user.FirstName ?? string.Empty,
                    LastName = user.LastName ?? string.Empty,
                    FirstNameFa = user.FirstNameFa ?? string.Empty,
                    LastNameFa = user.LastNameFa ?? string.Empty,
                    Roles = roles,
                    IsDisabled = await _userManager.IsLockedOutAsync(user)
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during token refresh");
            return Unauthorized(new AuthResponseDto
            {
                Success = false,
                ErrorMessage = "Invalid token"
            });
        }
    }

    /// <summary>
    /// Get current user information from JWT token
    /// </summary>
    /// <returns>Current user information</returns>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(UserInfoDto), 200)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> GetCurrentUser()
    {
        try
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return Unauthorized();
            }

            var roles = await _userManager.GetRolesAsync(user);

            return Ok(new UserInfoDto
            {
                Id = user.Id,
                UserName = user.UserName ?? string.Empty,
                FirstName = user.FirstName ?? string.Empty,
                LastName = user.LastName ?? string.Empty,
                FirstNameFa = user.FirstNameFa ?? string.Empty,
                LastNameFa = user.LastNameFa ?? string.Empty,
                Roles = roles,
                IsDisabled = await _userManager.IsLockedOutAsync(user)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting current user");
            return StatusCode(500);
        }
    }

    /// <summary>
    /// Logout user (client should discard tokens)
    /// </summary>
    /// <returns>Success response</returns>
    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(200)]
    public async Task<IActionResult> Logout()
    {
        // TODO: If implementing refresh token blacklist, invalidate refresh token here
        
        await _signInManager.SignOutAsync();
        return Ok(new { message = "Logged out successfully" });
    }

    /// <summary>
    /// Disable or enable a user account (Admin only)
    /// </summary>
    /// <param name="request">Disable user request</param>
    /// <returns>Operation result</returns>
    [HttpPost("disable-user")]
    [Authorize] // TODO: Add role-based authorization for admin only
    [ProducesResponseType(typeof(OperationResponseDto), 200)]
    [ProducesResponseType(typeof(OperationResponseDto), 400)]
    [ProducesResponseType(typeof(OperationResponseDto), 404)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> DisableUser([FromBody] DisableUserRequestDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new OperationResponseDto
                {
                    Success = false,
                    Message = "Invalid input data"
                });
            }

            // Find the user to disable/enable
            var user = await _userManager.FindByIdAsync(request.UserId);
            if (user == null)
            {
                return NotFound(new OperationResponseDto
                {
                    Success = false,
                    Message = "User not found"
                });
            }

            // Prevent users from disabling themselves
            var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (currentUserId == request.UserId)
            {
                return BadRequest(new OperationResponseDto
                {
                    Success = false,
                    Message = "You cannot disable your own account"
                });
            }

            // Set lockout end time - if disabling, lockout indefinitely; if enabling, remove lockout
            var lockoutEnd = request.Disable 
                ? DateTimeOffset.MaxValue 
                : (DateTimeOffset?)null;

            var result = await _userManager.SetLockoutEndDateAsync(user, lockoutEnd);

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                return BadRequest(new OperationResponseDto
                {
                    Success = false,
                    Message = $"Failed to update user status: {errors}"
                });
            }

            var action = request.Disable ? "disabled" : "enabled";
            var reason = !string.IsNullOrEmpty(request.Reason) ? $" Reason: {request.Reason}" : "";
            
            _logger.LogInformation("User {UserId} has been {Action} by {AdminId}.{Reason}", 
                request.UserId, action, currentUserId, reason);

            return Ok(new OperationResponseDto
            {
                Success = true,
                Message = $"User {user.UserName} has been {action} successfully",
                Data = new { UserId = user.Id, UserName = user.UserName, IsDisabled = request.Disable }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while disabling/enabling user {UserId}", request.UserId);
            return StatusCode(500, new OperationResponseDto
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Update user information
    /// </summary>
    /// <param name="userId">User ID to update (optional - defaults to current user)</param>
    /// <param name="request">User information to update</param>
    /// <returns>Updated user information</returns>
    [HttpPut("update-user/{userId?}")]
    [Authorize]
    [ProducesResponseType(typeof(UserInfoDto), 200)]
    [ProducesResponseType(typeof(OperationResponseDto), 400)]
    [ProducesResponseType(typeof(OperationResponseDto), 404)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> UpdateUser(string? userId, [FromBody] UpdateUserRequestDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new OperationResponseDto
                {
                    Success = false,
                    Message = "Invalid input data"
                });
            }

            // Get current user ID from token
            var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(currentUserId))
            {
                return Unauthorized();
            }

            // If userId is not provided or empty, update current user
            var targetUserId = string.IsNullOrEmpty(userId) ? currentUserId : userId;

            // Check if user is trying to update someone else's profile
            // TODO: Add role-based authorization to allow admins to update any user
            if (currentUserId != targetUserId)
            {
                // For now, only allow users to update their own profile
                // In the future, you can add role checking here: 
                // var currentUserRoles = User.FindAll(System.Security.Claims.ClaimTypes.Role).Select(c => c.Value);
                // if (!currentUserRoles.Contains("Admin"))
                return Forbid();
            }

            // Find the user to update
            var user = await _userManager.FindByIdAsync(targetUserId);
            if (user == null)
            {
                return NotFound(new OperationResponseDto
                {
                    Success = false,
                    Message = "User not found"
                });
            }

            // Update user properties if provided
            bool hasChanges = false;

            if (!string.IsNullOrEmpty(request.FirstName))
            {
                user.FirstName = request.FirstName;
                hasChanges = true;
            }

            if (!string.IsNullOrEmpty(request.LastName))
            {
                user.LastName = request.LastName;
                hasChanges = true;
            }

            if (!string.IsNullOrEmpty(request.FirstNameFa))
            {
                user.FirstNameFa = request.FirstNameFa;
                hasChanges = true;
            }

            if (!string.IsNullOrEmpty(request.LastNameFa))
            {
                user.LastNameFa = request.LastNameFa;
                hasChanges = true;
            }

            if (!hasChanges)
            {
                return BadRequest(new OperationResponseDto
                {
                    Success = false,
                    Message = "No changes provided"
                });
            }

            // Save changes
            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                return BadRequest(new OperationResponseDto
                {
                    Success = false,
                    Message = $"Failed to update user: {errors}"
                });
            }

            // Get updated user roles
            var roles = await _userManager.GetRolesAsync(user);

            _logger.LogInformation("User {UserId} information updated by {CurrentUserId}", 
                targetUserId, currentUserId);

            return Ok(new UserInfoDto
            {
                Id = user.Id,
                UserName = user.UserName ?? string.Empty,
                FirstName = user.FirstName ?? string.Empty,
                LastName = user.LastName ?? string.Empty,
                FirstNameFa = user.FirstNameFa ?? string.Empty,
                LastNameFa = user.LastNameFa ?? string.Empty,
                Roles = roles,
                IsDisabled = await _userManager.IsLockedOutAsync(user)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user {UserId}", userId);
            return StatusCode(500, new OperationResponseDto
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Reset a user's password to the default value (12345)
    /// </summary>
    /// <param name="request">Reset password request containing the username</param>
    /// <returns>Result indicating success or failure of password reset operation</returns>
    /// <response code="200">Returns success status of the password reset</response>
    /// <response code="400">If the input is invalid or user not found</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="500">If an internal error occurs</response>
    [HttpPost("reset-password")]
    [Authorize]
    [ProducesResponseType(typeof(ResetPasswordResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ResetPasswordResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDto request)
    {
            try
            {
                var operation = "ResetPassword";
                var requestId = HttpContext?.TraceIdentifier ?? Guid.NewGuid().ToString();

                if (!ModelState.IsValid)
                {
                    _logger.LogWarning("{Operation} - {RequestId} - Invalid model state for reset password request", operation, requestId);
                    return BadRequest(new ResetPasswordResponseDto
                    {
                        IsSuccessful = false,
                        Message = "Invalid input data",
                        Errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList()
                    });
                }

                if (string.IsNullOrWhiteSpace(request.UserName))
                {
                    _logger.LogWarning("{Operation} - {RequestId} - Empty userName provided", operation, requestId);
                    return BadRequest(new ResetPasswordResponseDto
                    {
                        IsSuccessful = false,
                        Message = "UserName is required",
                    });
                }

                var user = await _userManager.FindByNameAsync(request.UserName);

                if (user == null)
                {
                    _logger.LogWarning("{Operation} - {RequestId} - User not found: {UserName}", operation, requestId, request.UserName);
                    return NotFound(new ResetPasswordResponseDto
                    {
                        IsSuccessful = false,
                        Message = "User not found"
                    });
                }

                var password = "12345"; // Default password per project spec
                var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
                var resetPassResult = await _userManager.ResetPasswordAsync(user, resetToken, password);

                _logger.LogInformation("{Operation} - {RequestId} - Password reset for user {UserName} - Success: {Success}", 
                    operation, requestId, request.UserName, resetPassResult.Succeeded);

                if (!resetPassResult.Succeeded)
                {
                    var errors = resetPassResult.Errors.Select(e => e.Description).ToList();
                    return BadRequest(new ResetPasswordResponseDto
                    {
                        IsSuccessful = false,
                        Message = "Failed to reset password",
                        Errors = errors
                    });
                }

                return Ok(new ResetPasswordResponseDto
                {
                    IsSuccessful = true,
                    Message = "Password has been reset to default",
                });
            }
            catch (Exception ex)
            {
                var requestId = HttpContext?.TraceIdentifier ?? Guid.NewGuid().ToString();
                _logger.LogError(ex, "ResetPassword - {RequestId} - Error resetting password for user {UserName}", requestId, request?.UserName);
                return StatusCode(500, new ResetPasswordResponseDto
                {
                    IsSuccessful = false,
                    Message = "Internal server error"
                });
            }
    }

    /// <summary>
    /// Allow the current user to change their own password
    /// </summary>
    /// <param name="request">Change password request containing current password and new password</param>
    /// <returns>Result indicating success or failure of password change operation</returns>
    /// <response code="200">Returns success status of the password change</response>
    /// <response code="400">If the input is invalid or current password is incorrect</response>
    /// <response code="401">If user is not authenticated</response>
    /// <response code="500">If an internal error occurs</response>
    [HttpPost("change-password")]
    [Authorize]
    [ProducesResponseType(typeof(ChangePasswordResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ChangePasswordResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequestDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ChangePasswordResponseDto
                {
                    IsSuccessful = false
                });
            }

            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var user = await _userManager.FindByIdAsync(userId);

            if (user == null)
            {
                return Unauthorized();
            }

            var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);

            if (result.Succeeded)
            {
                _logger.LogInformation("Password changed successfully for user {UserId}", userId);
            }
            else
            {
                _logger.LogWarning("Password change failed for user {UserId}", userId);
            }

            return Ok(new ChangePasswordResponseDto
            {
                IsSuccessful = result.Succeeded
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error changing password for user");
            return StatusCode(500, new ChangePasswordResponseDto
            {
                IsSuccessful = false
            });
        }
    }

    /// <summary>
    /// Get all users in the system with optional filtering and pagination (Admin only)
    /// </summary>
    /// <param name="request">Get users request containing optional search term, role filter, and pagination parameters</param>
    /// <returns>Paginated list of users with their details and roles</returns>
    /// <remarks>
    /// **Admin-only endpoint** that retrieves all users in the system with optional filtering capabilities.
    /// 
    /// **Filtering Options:**
    /// - SearchTerm: Search by username, first name, or last name (case-insensitive partial match)
    /// - Role: Filter users by specific role (e.g., "Admin", "User")
    /// - IncludeDisabled: Whether to include disabled/locked users in results (default: true)
    /// 
    /// **Pagination:**
    /// - Default page size is 50 users
    /// - Maximum page size is 500 users
    /// - Page numbers are 1-based (first page is 1, not 0)
    /// - Response includes total count and total pages for navigation
    /// 
    /// Sample request to get all users (first page):
    /// 
    ///     POST /api/auth/users
    ///     {
    ///        "page": 1,
    ///        "pageSize": 50,
    ///        "includeDisabled": true
    ///     }
    ///     
    /// Sample request to search for users:
    /// 
    ///     POST /api/auth/users
    ///     {
    ///        "searchTerm": "john",
    ///        "page": 1,
    ///        "pageSize": 20
    ///     }
    ///     
    /// Sample request to get users with specific role:
    /// 
    ///     POST /api/auth/users
    ///     {
    ///        "role": "Admin",
    ///        "includeDisabled": false
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Returns the paginated list of users</response>
    /// <response code="400">Validation error - invalid request parameters</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="403">Forbidden - Admin role required</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("users")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(GetUsersResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetUsers([FromBody] GetUsersRequestDto request)
    {
        try
        {
            _logger.LogInformation("Getting users list with filters: SearchTerm={SearchTerm}, Role={Role}", 
                request.SearchTerm, request.Role);

            if (!ModelState.IsValid)
            {
                return BadRequest(new GetUsersResponseDto
                {
                    Success = false,
                    ErrorMessage = "Invalid input data"
                });
            }

            // Build query
            var query = _userManager.Users.AsQueryable();

            // Apply search filter
            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var searchTerm = request.SearchTerm.ToLower();
                query = query.Where(u => 
                    u.UserName!.ToLower().Contains(searchTerm) ||
                    (u.FirstName != null && u.FirstName.ToLower().Contains(searchTerm)) ||
                    (u.LastName != null && u.LastName.ToLower().Contains(searchTerm)) ||
                    (u.FirstNameFa != null && u.FirstNameFa.Contains(searchTerm)) ||
                    (u.LastNameFa != null && u.LastNameFa.Contains(searchTerm)));
            }

            // Apply role filter
            if (!string.IsNullOrWhiteSpace(request.Role))
            {
                var usersInRole = await _userManager.GetUsersInRoleAsync(request.Role);
                var userIds = usersInRole.Select(u => u.Id).ToList();
                query = query.Where(u => userIds.Contains(u.Id));
            }

            // Get total count before pagination
            var totalCount = await query.CountAsync();

            // Apply pagination
            var users = await query
                .OrderBy(u => u.UserName)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToListAsync();

            // Map to DTOs and get roles for each user
            var userDtos = new List<UserInfoDto>();
            foreach (var user in users)
            {
                var roles = await _userManager.GetRolesAsync(user);
                var isDisabled = await _userManager.IsLockedOutAsync(user);

                // Apply disabled filter
                if (!request.IncludeDisabled && isDisabled)
                    continue;

                userDtos.Add(new UserInfoDto
                {
                    Id = user.Id,
                    UserName = user.UserName ?? string.Empty,
                    FirstName = user.FirstName ?? string.Empty,
                    LastName = user.LastName ?? string.Empty,
                    FirstNameFa = user.FirstNameFa ?? string.Empty,
                    LastNameFa = user.LastNameFa ?? string.Empty,
                    Roles = roles,
                    IsDisabled = isDisabled
                });
            }

            var totalPages = (int)Math.Ceiling(totalCount / (double)request.PageSize);

            _logger.LogInformation("Retrieved {Count} users (page {Page} of {TotalPages})", 
                userDtos.Count, request.Page, totalPages);

            return Ok(new GetUsersResponseDto
            {
                Success = true,
                Users = userDtos,
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize,
                TotalPages = totalPages
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting users list");
            return StatusCode(500, new GetUsersResponseDto
            {
                Success = false,
                ErrorMessage = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Get a single user's details by user ID (Admin only)
    /// </summary>
    /// <param name="request">Get user request containing the user ID</param>
    /// <returns>User details including roles and status</returns>
    /// <remarks>
    /// **Admin-only endpoint** that retrieves detailed information for a specific user.
    /// 
    /// Sample request:
    /// 
    ///     POST /api/auth/user
    ///     {
    ///        "userId": "550e8400-e29b-41d4-a716-446655440000"
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Returns the user details</response>
    /// <response code="400">Validation error - invalid user ID format</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="403">Forbidden - Admin role required</response>
    /// <response code="404">User not found</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("user")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(GetUserResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetUser([FromBody] GetUserRequestDto request)
    {
        try
        {
            _logger.LogInformation("Getting user details for user ID: {UserId}", request.UserId);

            if (!ModelState.IsValid)
            {
                return BadRequest(new GetUserResponseDto
                {
                    Success = false,
                    ErrorMessage = "Invalid input data"
                });
            }

            var user = await _userManager.FindByIdAsync(request.UserId);
            if (user == null)
            {
                _logger.LogWarning("User not found: {UserId}", request.UserId);
                return NotFound(new GetUserResponseDto
                {
                    Success = false,
                    ErrorMessage = "User not found"
                });
            }

            var roles = await _userManager.GetRolesAsync(user);
            var isDisabled = await _userManager.IsLockedOutAsync(user);

            return Ok(new GetUserResponseDto
            {
                Success = true,
                User = new UserInfoDto
                {
                    Id = user.Id,
                    UserName = user.UserName ?? string.Empty,
                    FirstName = user.FirstName ?? string.Empty,
                    LastName = user.LastName ?? string.Empty,
                    FirstNameFa = user.FirstNameFa ?? string.Empty,
                    LastNameFa = user.LastNameFa ?? string.Empty,
                    Roles = roles,
                    IsDisabled = isDisabled
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user details for user ID: {UserId}", request.UserId);
            return StatusCode(500, new GetUserResponseDto
            {
                Success = false,
                ErrorMessage = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Edit a user's information (Admin only)
    /// </summary>
    /// <param name="request">Edit user request containing user ID and updated information</param>
    /// <returns>Result indicating success or failure with updated user details</returns>
    /// <remarks>
    /// **Admin-only endpoint** that updates a user's profile information including names and username.
    /// This endpoint does NOT change passwords or roles - use dedicated endpoints for those operations.
    /// 
    /// **Validation:**
    /// - First name and last name are required (1-50 characters)
    /// - Farsi names are optional (max 50 characters)
    /// - Username is required (3-50 characters) and must be unique
    /// - Cannot edit the currently logged-in user's own information through this endpoint
    /// 
    /// Sample request:
    /// 
    ///     POST /api/auth/edit-user
    ///     {
    ///        "userId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "firstName": "John",
    ///        "lastName": "Doe",
    ///        "firstNameFa": "جان",
    ///        "lastNameFa": "دو",
    ///        "userName": "johndoe"
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">User information updated successfully</response>
    /// <response code="400">Validation error - invalid input, duplicate username, or attempting to edit self</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="403">Forbidden - Admin role required</response>
    /// <response code="404">User not found</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("edit-user")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(EditUserResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> EditUser([FromBody] EditUserRequestDto request)
    {
        try
        {
            _logger.LogInformation("Editing user: {UserId}", request.UserId);

            if (!ModelState.IsValid)
            {
                return BadRequest(new EditUserResponseDto
                {
                    Success = false,
                    Message = "Invalid input data"
                });
            }

            // Prevent admin from editing themselves through this endpoint
            var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (currentUserId == request.UserId)
            {
                return BadRequest(new EditUserResponseDto
                {
                    Success = false,
                    Message = "Cannot edit your own user information through this endpoint"
                });
            }

            var user = await _userManager.FindByIdAsync(request.UserId);
            if (user == null)
            {
                _logger.LogWarning("User not found: {UserId}", request.UserId);
                return NotFound(new EditUserResponseDto
                {
                    Success = false,
                    Message = "User not found"
                });
            }

            // Check if username is being changed and if new username already exists
            if (user.UserName != request.UserName)
            {
                var existingUser = await _userManager.FindByNameAsync(request.UserName);
                if (existingUser != null && existingUser.Id != request.UserId)
                {
                    return BadRequest(new EditUserResponseDto
                    {
                        Success = false,
                        Message = "Username already exists"
                    });
                }
                user.UserName = request.UserName;
            }

            // Update user information
            user.FirstName = request.FirstName;
            user.LastName = request.LastName;
            user.FirstNameFa = request.FirstNameFa ?? string.Empty;
            user.LastNameFa = request.LastNameFa ?? string.Empty;

            var result = await _userManager.UpdateAsync(user);

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                _logger.LogWarning("Failed to update user {UserId}: {Errors}", request.UserId, errors);
                return BadRequest(new EditUserResponseDto
                {
                    Success = false,
                    Message = $"Failed to update user: {errors}"
                });
            }

            var roles = await _userManager.GetRolesAsync(user);
            var isDisabled = await _userManager.IsLockedOutAsync(user);

            _logger.LogInformation("User {UserId} updated successfully", request.UserId);

            return Ok(new EditUserResponseDto
            {
                Success = true,
                Message = "User updated successfully",
                User = new UserInfoDto
                {
                    Id = user.Id,
                    UserName = user.UserName ?? string.Empty,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    FirstNameFa = user.FirstNameFa,
                    LastNameFa = user.LastNameFa,
                    Roles = roles,
                    IsDisabled = isDisabled
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error editing user: {UserId}", request.UserId);
            return StatusCode(500, new EditUserResponseDto
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Delete a user from the system (Admin only)
    /// </summary>
    /// <param name="request">Delete user request containing the user ID</param>
    /// <returns>Result indicating success or failure of user deletion</returns>
    /// <remarks>
    /// **Admin-only endpoint** that permanently deletes a user from the system.
    /// 
    /// **Important Notes:**
    /// - This operation is irreversible
    /// - Cannot delete your own user account
    /// - All user data and associations will be removed
    /// - User permissions and audit logs will be preserved for compliance
    /// 
    /// Sample request:
    /// 
    ///     POST /api/auth/delete-user
    ///     {
    ///        "userId": "550e8400-e29b-41d4-a716-446655440000"
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">User deleted successfully</response>
    /// <response code="400">Validation error - invalid user ID or attempting to delete self</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="403">Forbidden - Admin role required</response>
    /// <response code="404">User not found</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("delete-user")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(DeleteUserResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeleteUser([FromBody] DeleteUserRequestDto request)
    {
        try
        {
            _logger.LogInformation("Deleting user: {UserId}", request.UserId);

            if (!ModelState.IsValid)
            {
                return BadRequest(new DeleteUserResponseDto
                {
                    Success = false,
                    Message = "Invalid input data"
                });
            }

            // Prevent admin from deleting themselves
            var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (currentUserId == request.UserId)
            {
                return BadRequest(new DeleteUserResponseDto
                {
                    Success = false,
                    Message = "Cannot delete your own user account"
                });
            }

            var user = await _userManager.FindByIdAsync(request.UserId);
            if (user == null)
            {
                _logger.LogWarning("User not found: {UserId}", request.UserId);
                return NotFound(new DeleteUserResponseDto
                {
                    Success = false,
                    Message = "User not found"
                });
            }

            var result = await _userManager.DeleteAsync(user);

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                _logger.LogWarning("Failed to delete user {UserId}: {Errors}", request.UserId, errors);
                return BadRequest(new DeleteUserResponseDto
                {
                    Success = false,
                    Message = $"Failed to delete user: {errors}"
                });
            }

            _logger.LogInformation("User {UserId} deleted successfully", request.UserId);

            return Ok(new DeleteUserResponseDto
            {
                Success = true,
                Message = "User deleted successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting user: {UserId}", request.UserId);
            return StatusCode(500, new DeleteUserResponseDto
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Get all available roles in the system with user counts (Admin only)
    /// </summary>
    /// <returns>List of all roles with the number of users assigned to each role</returns>
    /// <remarks>
    /// **Admin-only endpoint** that retrieves all available roles in the system.
    /// Each role includes a count of how many users are currently assigned to it.
    /// 
    /// Sample request:
    /// 
    ///     GET /api/auth/roles
    ///     
    /// Sample response:
    /// 
    ///     {
    ///       "success": true,
    ///       "roles": [
    ///         {
    ///           "id": "1",
    ///           "name": "Admin",
    ///           "userCount": 3
    ///         },
    ///         {
    ///           "id": "2",
    ///           "name": "User",
    ///           "userCount": 15
    ///         }
    ///       ]
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Returns the list of all roles</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="403">Forbidden - Admin role required</response>
    /// <response code="500">Internal server error</response>
    [HttpGet("roles")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(GetRolesResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetRoles()
    {
        try
        {
            _logger.LogInformation("Getting all roles");

            var roles = await _roleManager.Roles.ToListAsync();
            var roleDtos = new List<RoleInfoDto>();

            foreach (var role in roles)
            {
                var usersInRole = await _userManager.GetUsersInRoleAsync(role.Name!);
                roleDtos.Add(new RoleInfoDto
                {
                    Id = role.Id,
                    Name = role.Name ?? string.Empty,
                    UserCount = usersInRole.Count
                });
            }

            _logger.LogInformation("Retrieved {Count} roles", roleDtos.Count);

            return Ok(new GetRolesResponseDto
            {
                Success = true,
                Roles = roleDtos
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting roles");
            return StatusCode(500, new GetRolesResponseDto
            {
                Success = false,
                ErrorMessage = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Update a user's roles (Admin only)
    /// </summary>
    /// <param name="request">Update user roles request containing user ID and list of roles</param>
    /// <returns>Result indicating success or failure with updated role list</returns>
    /// <remarks>
    /// **Admin-only endpoint** that replaces all of a user's current roles with the provided list.
    /// 
    /// **Important Notes:**
    /// - This operation replaces ALL existing roles with the new list
    /// - To remove all roles, provide an empty list
    /// - Cannot modify your own roles
    /// - Invalid role names will be ignored with a warning
    /// 
    /// Sample request to assign Admin and User roles:
    /// 
    ///     POST /api/auth/update-user-roles
    ///     {
    ///        "userId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "roles": ["Admin", "User"]
    ///     }
    ///     
    /// Sample request to remove all roles:
    /// 
    ///     POST /api/auth/update-user-roles
    ///     {
    ///        "userId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "roles": []
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">User roles updated successfully</response>
    /// <response code="400">Validation error - invalid input or attempting to modify own roles</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="403">Forbidden - Admin role required</response>
    /// <response code="404">User not found</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("update-user-roles")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(UpdateUserRolesResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> UpdateUserRoles([FromBody] UpdateUserRolesRequestDto request)
    {
        try
        {
            _logger.LogInformation("Updating roles for user: {UserId}", request.UserId);

            if (!ModelState.IsValid)
            {
                return BadRequest(new UpdateUserRolesResponseDto
                {
                    Success = false,
                    Message = "Invalid input data"
                });
            }

            // Prevent admin from modifying their own roles
            var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (currentUserId == request.UserId)
            {
                return BadRequest(new UpdateUserRolesResponseDto
                {
                    Success = false,
                    Message = "Cannot modify your own roles"
                });
            }

            var user = await _userManager.FindByIdAsync(request.UserId);
            if (user == null)
            {
                _logger.LogWarning("User not found: {UserId}", request.UserId);
                return NotFound(new UpdateUserRolesResponseDto
                {
                    Success = false,
                    Message = "User not found"
                });
            }

            // Get current roles
            var currentRoles = await _userManager.GetRolesAsync(user);

            // Remove all current roles
            if (currentRoles.Count > 0)
            {
                var removeResult = await _userManager.RemoveFromRolesAsync(user, currentRoles);
                if (!removeResult.Succeeded)
                {
                    var errors = string.Join(", ", removeResult.Errors.Select(e => e.Description));
                    _logger.LogWarning("Failed to remove roles from user {UserId}: {Errors}", request.UserId, errors);
                    return BadRequest(new UpdateUserRolesResponseDto
                    {
                        Success = false,
                        Message = $"Failed to remove existing roles: {errors}"
                    });
                }
            }

            // Add new roles (only valid ones)
            var validRoles = new List<string>();
            foreach (var roleName in request.Roles)
            {
                if (await _roleManager.RoleExistsAsync(roleName))
                {
                    validRoles.Add(roleName);
                }
                else
                {
                    _logger.LogWarning("Role {RoleName} does not exist, skipping", roleName);
                }
            }

            if (validRoles.Count > 0)
            {
                var addResult = await _userManager.AddToRolesAsync(user, validRoles);
                if (!addResult.Succeeded)
                {
                    var errors = string.Join(", ", addResult.Errors.Select(e => e.Description));
                    _logger.LogWarning("Failed to add roles to user {UserId}: {Errors}", request.UserId, errors);
                    return BadRequest(new UpdateUserRolesResponseDto
                    {
                        Success = false,
                        Message = $"Failed to add new roles: {errors}"
                    });
                }
            }

            // Get updated roles
            var updatedRoles = await _userManager.GetRolesAsync(user);

            _logger.LogInformation("Roles updated successfully for user {UserId}", request.UserId);

            return Ok(new UpdateUserRolesResponseDto
            {
                Success = true,
                Message = "User roles updated successfully",
                Roles = updatedRoles.ToList()
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating roles for user: {UserId}", request.UserId);
            return StatusCode(500, new UpdateUserRolesResponseDto
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Set a new password for a user (Admin only)
    /// </summary>
    /// <param name="request">Set user password request containing user ID and new password</param>
    /// <returns>Result indicating success or failure of password reset</returns>
    /// <remarks>
    /// **Admin-only endpoint** that allows an administrator to set a new password for any user
    /// without requiring the old password. This is useful for password resets when a user
    /// has forgotten their password or needs administrative intervention.
    /// 
    /// **Important Notes:**
    /// - Does NOT require the user's current password
    /// - Cannot change your own password through this endpoint (use change-password instead)
    /// - New password must meet the system's password requirements (minimum 6 characters)
    /// - User will be able to log in immediately with the new password
    /// 
    /// Sample request:
    /// 
    ///     POST /api/auth/set-user-password
    ///     {
    ///        "userId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "newPassword": "NewSecurePassword123!"
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">Password set successfully</response>
    /// <response code="400">Validation error - invalid input, password too weak, or attempting to change own password</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="403">Forbidden - Admin role required</response>
    /// <response code="404">User not found</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("set-user-password")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(SetUserPasswordResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> SetUserPassword([FromBody] SetUserPasswordRequestDto request)
    {
        try
        {
            _logger.LogInformation("Setting password for user: {UserId}", request.UserId);

            if (!ModelState.IsValid)
            {
                return BadRequest(new SetUserPasswordResponseDto
                {
                    Success = false,
                    Message = "Invalid input data"
                });
            }

            // Prevent admin from changing their own password through this endpoint
            var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (currentUserId == request.UserId)
            {
                return BadRequest(new SetUserPasswordResponseDto
                {
                    Success = false,
                    Message = "Cannot change your own password through this endpoint. Use change-password instead."
                });
            }

            var user = await _userManager.FindByIdAsync(request.UserId);
            if (user == null)
            {
                _logger.LogWarning("User not found: {UserId}", request.UserId);
                return NotFound(new SetUserPasswordResponseDto
                {
                    Success = false,
                    Message = "User not found"
                });
            }

            // Remove existing password and set new one
            var removeResult = await _userManager.RemovePasswordAsync(user);
            if (!removeResult.Succeeded)
            {
                var errors = string.Join(", ", removeResult.Errors.Select(e => e.Description));
                _logger.LogWarning("Failed to remove password for user {UserId}: {Errors}", request.UserId, errors);
                return BadRequest(new SetUserPasswordResponseDto
                {
                    Success = false,
                    Message = $"Failed to reset password: {errors}"
                });
            }

            var addResult = await _userManager.AddPasswordAsync(user, request.NewPassword);
            if (!addResult.Succeeded)
            {
                var errors = string.Join(", ", addResult.Errors.Select(e => e.Description));
                _logger.LogWarning("Failed to set new password for user {UserId}: {Errors}", request.UserId, errors);
                return BadRequest(new SetUserPasswordResponseDto
                {
                    Success = false,
                    Message = $"Failed to set new password: {errors}"
                });
            }

            _logger.LogInformation("Password set successfully for user {UserId}", request.UserId);

            return Ok(new SetUserPasswordResponseDto
            {
                Success = true,
                Message = "Password set successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting password for user: {UserId}", request.UserId);
            return StatusCode(500, new SetUserPasswordResponseDto
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Toggle a user's enabled/disabled status (Admin only)
    /// </summary>
    /// <param name="request">Toggle user status request containing user ID and disable flag</param>
    /// <returns>Result indicating success or failure with current user status</returns>
    /// <remarks>
    /// **Admin-only endpoint** that enables or disables a user account by setting/removing
    /// a lockout end date. Disabled users cannot log in to the system.
    /// 
    /// **Important Notes:**
    /// - Disabling sets lockout until year 9999 (effectively permanent)
    /// - Enabling removes the lockout immediately
    /// - Cannot disable your own account
    /// - Disabled users remain in the system but cannot authenticate
    /// 
    /// Sample request to disable a user:
    /// 
    ///     POST /api/auth/toggle-user-status
    ///     {
    ///        "userId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "disable": true
    ///     }
    ///     
    /// Sample request to enable a user:
    /// 
    ///     POST /api/auth/toggle-user-status
    ///     {
    ///        "userId": "550e8400-e29b-41d4-a716-446655440000",
    ///        "disable": false
    ///     }
    ///     
    /// </remarks>
    /// <response code="200">User status toggled successfully</response>
    /// <response code="400">Validation error - invalid input or attempting to disable self</response>
    /// <response code="401">Unauthorized - valid JWT token required</response>
    /// <response code="403">Forbidden - Admin role required</response>
    /// <response code="404">User not found</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("toggle-user-status")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ToggleUserStatusResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ToggleUserStatus([FromBody] ToggleUserStatusRequestDto request)
    {
        try
        {
            _logger.LogInformation("Toggling status for user: {UserId}, Disable: {Disable}", 
                request.UserId, request.Disable);

            if (!ModelState.IsValid)
            {
                return BadRequest(new ToggleUserStatusResponseDto
                {
                    Success = false,
                    Message = "Invalid input data"
                });
            }

            // Prevent admin from disabling themselves
            var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (currentUserId == request.UserId)
            {
                return BadRequest(new ToggleUserStatusResponseDto
                {
                    Success = false,
                    Message = "Cannot disable your own account"
                });
            }

            var user = await _userManager.FindByIdAsync(request.UserId);
            if (user == null)
            {
                _logger.LogWarning("User not found: {UserId}", request.UserId);
                return NotFound(new ToggleUserStatusResponseDto
                {
                    Success = false,
                    Message = "User not found"
                });
            }

            IdentityResult result;
            if (request.Disable)
            {
                // Set lockout end date to a far future date (effectively permanent)
                result = await _userManager.SetLockoutEndDateAsync(user, DateTimeOffset.MaxValue);
            }
            else
            {
                // Remove lockout
                result = await _userManager.SetLockoutEndDateAsync(user, null);
            }

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                _logger.LogWarning("Failed to toggle status for user {UserId}: {Errors}", request.UserId, errors);
                return BadRequest(new ToggleUserStatusResponseDto
                {
                    Success = false,
                    Message = $"Failed to update user status: {errors}"
                });
            }

            var isDisabled = await _userManager.IsLockedOutAsync(user);

            _logger.LogInformation("User {UserId} status toggled successfully. IsDisabled: {IsDisabled}", 
                request.UserId, isDisabled);

            return Ok(new ToggleUserStatusResponseDto
            {
                Success = true,
                Message = isDisabled ? "User disabled successfully" : "User enabled successfully",
                IsDisabled = isDisabled
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error toggling status for user: {UserId}", request.UserId);
            return StatusCode(500, new ToggleUserStatusResponseDto
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }
}