namespace API.Models.Dto;

/// <summary>
/// Request DTO for adding a new user to the system
/// </summary>
public class AddUserRequestDto
{
    /// <summary>
    /// Unique username for the new user
    /// </summary>
    public string UserName { get; set; }

    /// <summary>
    /// User's first name
    /// </summary>
    public string FirstName { get; set; }

    /// <summary>
    /// User's last name
    /// </summary>
    public string LastName { get; set; }
}