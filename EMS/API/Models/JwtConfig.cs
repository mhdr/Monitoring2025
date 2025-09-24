namespace API.Models;

/// <summary>
/// JWT Configuration settings
/// </summary>
public class JwtConfig
{
    /// <summary>
    /// Secret key used for signing JWT tokens
    /// </summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>
    /// Token issuer
    /// </summary>
    public string Issuer { get; set; } = string.Empty;

    /// <summary>
    /// Token audience
    /// </summary>
    public string Audience { get; set; } = string.Empty;

    /// <summary>
    /// JWT token expiry time in minutes
    /// </summary>
    public int ExpiryInMinutes { get; set; }

    /// <summary>
    /// Refresh token expiry time in days
    /// </summary>
    public int RefreshTokenExpiryInDays { get; set; }
}