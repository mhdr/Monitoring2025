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
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponseDto), 200)]
    [ProducesResponseType(typeof(AuthResponseDto), 400)]
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
                    Roles = roles
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
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponseDto), 200)]
    [ProducesResponseType(typeof(AuthResponseDto), 400)]
    [ProducesResponseType(typeof(AuthResponseDto), 401)]
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
                    Roles = roles
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
                    Roles = roles
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
                Roles = roles
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
}