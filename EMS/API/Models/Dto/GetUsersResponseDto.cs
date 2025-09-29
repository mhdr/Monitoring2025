using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Response DTO containing system users information
/// </summary>
public class GetUsersResponseDto
{
    /// <summary>
    /// List of system users
    /// </summary>
    public List<User> Data { get; set; }

    /// <summary>
    /// Initializes a new instance of the GetUsersResponseDto
    /// </summary>
    public GetUsersResponseDto()
    {
        Data = new();
    }

    /// <summary>
    /// Represents a system user with basic information and roles
    /// </summary>
    public class User
    {
        /// <summary>
        /// Unique identifier for the user
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440000</example>
        public Guid Id { get; set; }

        /// <summary>
        /// Username for login
        /// </summary>
        /// <example>john.doe</example>
        public string UserName { get; set; }

        /// <summary>
        /// User's first name
        /// </summary>
        /// <example>John</example>
        public string FirstName { get; set; }

        /// <summary>
        /// User's last name
        /// </summary>
        /// <example>Doe</example>
        public string LastName { get; set; }

        /// <summary>
        /// List of assigned roles for this user
        /// </summary>
        /// <example>["Operator", "Supervisor"]</example>
        public List<string> Roles { get; set; }
    }
}