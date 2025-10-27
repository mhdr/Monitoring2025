namespace API.Models.Dto;

/// <summary>
/// Response model for deleting a monitoring group
/// </summary>
public class DeleteGroupResponseDto
{
    /// <summary>
    /// Indicates whether the group was deleted successfully
    /// </summary>
    /// <example>true</example>
    public bool Success { get; set; }

    /// <summary>
    /// Descriptive message about the operation result
    /// </summary>
    /// <example>Monitoring group deleted successfully</example>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Error type if the operation failed
    /// </summary>
    public DeleteGroupErrorType? Error { get; set; }

    /// <summary>
    /// Types of errors that can occur when deleting a group
    /// </summary>
    public enum DeleteGroupErrorType
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
        /// The group contains child groups and cannot be deleted
        /// </summary>
        GroupHasChildren,

        /// <summary>
        /// The group contains monitoring items and cannot be deleted
        /// </summary>
        GroupHasItems,

        /// <summary>
        /// The group contains both child groups and items
        /// </summary>
        GroupNotEmpty,

        /// <summary>
        /// User does not have permission to delete this group
        /// </summary>
        Unauthorized,

        /// <summary>
        /// Database error or unknown error occurred
        /// </summary>
        UnknownError
    }
}