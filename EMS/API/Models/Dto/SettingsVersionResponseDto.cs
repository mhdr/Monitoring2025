using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Response DTO containing system settings version information
/// </summary>
public class SettingsVersionResponseDto
{
    /// <summary>
    /// Current system settings version
    /// </summary>
    /// <example>1.0.2024.01</example>
    public string? Version { get; set; }

    /// <summary>
    /// User-specific settings version for cache management
    /// </summary>
    /// <example>1.0.2024.01.user123</example>
    public string? UserVersion { get; set; }
}