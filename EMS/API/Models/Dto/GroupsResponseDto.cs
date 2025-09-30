using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Response DTO containing groups accessible to the user
/// </summary>
public class GroupsResponseDto
{
    /// <summary>
    /// List of groups accessible to the user
    /// </summary>
    public List<Group> Groups { get; set; }

    /// <summary>
    /// Initializes a new instance of the GroupsResponseDto
    /// </summary>
    public GroupsResponseDto()
    {
        Groups = new List<Group>();
    }

    /// <summary>
    /// Represents a monitoring group
    /// </summary>
    public class Group
    {
        /// <summary>
        /// Unique identifier for the group
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440000</example>
        public string Id { get; set; }

        /// <summary>
        /// Name of the group
        /// </summary>
        /// <example>Cold Room</example>
        public string Name { get; set; }
        
        /// <summary>
        /// Name of the group in Farsi
        /// </summary>
        /// <example>سردخانه</example>
        public string? NameFa { get; set; }

        /// <summary>
        /// Parent group ID if this group has a parent
        /// </summary>
        /// <example>550e8400-e29b-41d4-a716-446655440001</example>
        public string ParentId { get; set; }
    }
}