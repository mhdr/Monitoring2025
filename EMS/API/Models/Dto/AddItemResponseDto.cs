namespace API.Models.Dto;

/// <summary>
/// Response model for adding a new monitoring item
/// </summary>
public class AddItemResponseDto
{
    /// <summary>
    /// Indicates if the add operation was successful
    /// </summary>
    /// <example>true</example>
    public bool Success { get; set; }

    /// <summary>
    /// Detailed message about the operation result
    /// </summary>
    /// <example>Monitoring item created successfully</example>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// The unique identifier of the newly created monitoring item
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    public Guid? ItemId { get; set; }

    /// <summary>
    /// Error type if the operation failed
    /// </summary>
    public AddItemErrorType? Error { get; set; }

    /// <summary>
    /// Types of errors that can occur during item creation
    /// </summary>
    public enum AddItemErrorType
    {
        /// <summary>
        /// Another item already has the specified point number
        /// </summary>
        DuplicatePointNumber,

        /// <summary>
        /// User does not have permission to create items
        /// </summary>
        Unauthorized,

        /// <summary>
        /// Validation error with the provided data
        /// </summary>
        ValidationError,

        /// <summary>
        /// The specified parent group was not found
        /// </summary>
        ParentGroupNotFound,

        /// <summary>
        /// Unknown error occurred during the operation
        /// </summary>
        UnknownError
    }
}
