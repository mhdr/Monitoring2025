using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request model for editing an existing monitoring group
/// </summary>
public class EditGroupRequestDto
{
    /// <summary>
    /// ID of the group to edit (required)
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    [Required(ErrorMessage = "Group ID is required")]
    public Guid Id { get; set; }

    /// <summary>
    /// Updated name of the monitoring group (required, 1-100 characters)
    /// </summary>
    /// <example>Building A - HVAC System</example>
    [Required(ErrorMessage = "Group name is required")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Group name must be between 1 and 100 characters")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Updated name of the monitoring group in Farsi (optional, 1-100 characters)
    /// </summary>
    /// <example>ساختمان الف - سیستم تهویه مطبوع</example>
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Group name (Farsi) must be between 1 and 100 characters")]
    public string? NameFa { get; set; }
}
