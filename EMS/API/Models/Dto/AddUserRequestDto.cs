using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for adding a new user to the system
/// </summary>
public class AddUserRequestDto
{
    /// <summary>
    /// Unique username for the new user
    /// </summary>
    /// <example>john.doe</example>
    [Required]
    [StringLength(50)]
    public string UserName { get; set; }

    /// <summary>
    /// User's first name
    /// </summary>
    /// <example>John</example>
    [Required]
    [StringLength(50)]
    public string FirstName { get; set; }

    /// <summary>
    /// User's last name
    /// </summary>
    /// <example>Doe</example>
    [Required]
    [StringLength(50)]
    public string LastName { get; set; }
}