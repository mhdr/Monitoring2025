using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authorization;
using API.Models.Dto;
using API.Services;
using DB.User.Models;

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
    private readonly IJwtTokenService _jwtTokenService;
    private readonly ILogger<AuthController> _logger;

    /// <summary>
    /// Initializes a new instance of the AuthController
    /// </summary>
    /// <param name="userManager">The user manager service</param>
    /// <param name="signInManager">The sign-in manager service</param>
    /// <param name="jwtTokenService">The JWT token service</param>
    /// <param name="logger">The logger service</param>
    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IJwtTokenService jwtTokenService,
        ILogger<AuthController> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
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
            if (!ModelState.IsValid)
            {
                return BadRequest(new ResetPasswordResponseDto
                {
                    IsSuccessful = false
                });
            }

            if (string.IsNullOrEmpty(request.UserName))
            {
                return BadRequest(new ResetPasswordResponseDto
                {
                    IsSuccessful = false
                });
            }

            var user = await _userManager.FindByNameAsync(request.UserName);

            if (user == null)
            {
                return BadRequest(new ResetPasswordResponseDto
                {
                    IsSuccessful = false
                });
            }

            var password = "12345";
            var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
            var resetPassResult = await _userManager.ResetPasswordAsync(user, resetToken, password);

            _logger.LogInformation("Password reset for user {UserName} - Success: {Success}", 
                request.UserName, resetPassResult.Succeeded);

            return Ok(new ResetPasswordResponseDto
            {
                IsSuccessful = resetPassResult.Succeeded
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting password for user {UserName}", request.UserName);
            return StatusCode(500, new ResetPasswordResponseDto
            {
                IsSuccessful = false
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
}