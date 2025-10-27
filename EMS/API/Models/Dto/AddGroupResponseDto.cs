namespace API.Models.Dto;

/// <summary>
/// Response model for adding a new monitoring group
/// </summary>
public class AddGroupResponseDto
{
    /// <summary>
    /// Indicates whether the group was created successfully
    /// </summary>
    /// <example>true</example>
    public bool Success { get; set; }

    /// <summary>
    /// Descriptive message about the operation result
    /// </summary>
    /// <example>Monitoring group created successfully</example>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// ID of the newly created group
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    public Guid? GroupId { get; set; }

    /// <summary>
    /// Error type if the operation failed
    /// </summary>
    public AddGroupErrorType? Error { get; set; }

    /// <summary>
    /// Types of errors that can occur when adding a group
    /// </summary>
    public enum AddGroupErrorType
    {
        /// <summary>
        /// Input validation failed
        /// </summary>
        ValidationError,

        /// <summary>
        /// A group with the same name already exists
        /// </summary>
        DuplicateGroupName,

        /// <summary>
        /// The specified parent group does not exist
        /// </summary>
        ParentGroupNotFound,

        /// <summary>
        /// Database error or unknown error occurred
        /// </summary>
        UnknownError
    }
}