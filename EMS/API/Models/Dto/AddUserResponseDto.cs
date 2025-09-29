using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Response DTO for adding a new user to the system
/// </summary>
public class AddUserResponseDto
{
    /// <summary>
    /// Indicates whether the user creation was successful
    /// </summary>
    /// <example>true</example>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// Error type if user creation failed
    /// </summary>
    public ErrorType? Error { get; set; }

    /// <summary>
    /// Enumeration of possible error types during user creation
    /// </summary>
    public enum ErrorType
    {
        /// <summary>
        /// Username already exists in the system
        /// </summary>
        DuplicateUserName = 1,
        
        /// <summary>
        /// Username field is empty or null
        /// </summary>
        EmptyUserName = 2,
    }
}