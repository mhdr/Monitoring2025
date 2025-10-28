namespace API.Models.Dto;

/// <summary>
/// Response model for editing a monitoring group
/// </summary>
public class EditGroupResponseDto
{
    /// <summary>
    /// Indicates whether the group was updated successfully
    /// </summary>
    /// <example>true</example>
    public bool Success { get; set; }

    /// <summary>
    /// Descriptive message about the operation result
    /// </summary>
    /// <example>Monitoring group updated successfully</example>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Error type if the operation failed
    /// </summary>
    public EditGroupErrorType? Error { get; set; }

    /// <summary>
    /// Types of errors that can occur when editing a group
    /// </summary>
    public enum EditGroupErrorType
    {
        /// <summary>
        /// Input validation failed
        /// </summary>
        ValidationError,

        /// <summary>
        /// The specified group does not exist
        /// </summary>
        GroupNotFound,

        /// <summary>
        /// A group with the same name already exists in the same parent location
        /// </summary>
        DuplicateGroupName,

        /// <summary>
        /// Database error or unknown error occurred
        /// </summary>
        UnknownError
    }
}
