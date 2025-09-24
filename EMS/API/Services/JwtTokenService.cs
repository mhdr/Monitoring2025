using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using API.Models;
using DB.User.Models;

namespace API.Services;

/// <summary>
/// Service for handling JWT token operations
/// </summary>
public interface IJwtTokenService
{
    /// <summary>
    /// Generate JWT access token for the given user
    /// </summary>
    /// <param name="user">Application user</param>
    /// <param name="roles">User roles</param>
    /// <returns>JWT access token</returns>
    string GenerateAccessToken(ApplicationUser user, IList<string> roles);

    /// <summary>
    /// Generate refresh token
    /// </summary>
    /// <returns>Refresh token string</returns>
    string GenerateRefreshToken();

    /// <summary>
    /// Get principal from expired token
    /// </summary>
    /// <param name="token">Expired JWT token</param>
    /// <returns>Claims principal</returns>
    ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
}

/// <summary>
/// JWT Token Service Implementation
/// </summary>
public class JwtTokenService : IJwtTokenService
{
    private readonly JwtConfig _jwtConfig;
    private readonly ILogger<JwtTokenService> _logger;

    public JwtTokenService(JwtConfig jwtConfig, ILogger<JwtTokenService> logger)
    {
        _jwtConfig = jwtConfig;
        _logger = logger;
    }

    public string GenerateAccessToken(ApplicationUser user, IList<string> roles)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_jwtConfig.Key);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Name, user.UserName ?? string.Empty),
            new("firstName", user.FirstName ?? string.Empty),
            new("lastName", user.LastName ?? string.Empty),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        };

        // Add role claims
        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(_jwtConfig.ExpiryInMinutes),
            Issuer = _jwtConfig.Issuer,
            Audience = _jwtConfig.Audience,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        var tokenString = tokenHandler.WriteToken(token);

        _logger.LogInformation("Generated JWT token for user {UserId}", user.Id);
        return tokenString;
    }

    public string GenerateRefreshToken()
    {
        var randomNumber = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }

    public ClaimsPrincipal? GetPrincipalFromExpiredToken(string token)
    {
        var tokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = false,
            ValidateIssuer = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(_jwtConfig.Key)),
            ValidateLifetime = false // Here we are saying that we don't care about the token's expiration date
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out var securityToken);
        
        if (securityToken is not JwtSecurityToken jwtSecurityToken || 
            !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
        {
            throw new SecurityTokenException("Invalid token");
        }

        return principal;
    }
}