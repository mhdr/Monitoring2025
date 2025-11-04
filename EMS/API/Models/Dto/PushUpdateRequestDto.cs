using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request model for triggering a settings update notification to all connected clients
/// </summary>
public class PushUpdateRequestDto
{
    /// <summary>
    /// Optional message describing the update reason for audit logging purposes
    /// </summary>
    /// <example>Manual settings refresh triggered by administrator</example>
    public string? Message { get; set; }
}
