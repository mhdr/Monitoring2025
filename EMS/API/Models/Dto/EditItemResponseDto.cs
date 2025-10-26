namespace API.Models.Dto;

/// <summary>
/// Response model for editing a monitoring item
/// </summary>
public class EditItemResponseDto
{
    /// <summary>
    /// Indicates if the edit operation was successful
    /// </summary>
    /// <example>true</example>
    public bool Success { get; set; }

    /// <summary>
    /// Detailed message about the operation result
    /// </summary>
    /// <example>Monitoring item updated successfully</example>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Error type if the operation failed
    /// </summary>
    public EditItemErrorType? Error { get; set; }

    /// <summary>
    /// Types of errors that can occur during item editing
    /// </summary>
    public enum EditItemErrorType
    {
        /// <summary>
        /// The specified item was not found
        /// </summary>
        ItemNotFound,

        /// <summary>
        /// Another item already has the specified point number
        /// </summary>
        DuplicatePointNumber,

        /// <summary>
        /// User does not have permission to edit this item
        /// </summary>
        Unauthorized,

        /// <summary>
        /// Validation error with the provided data
        /// </summary>
        ValidationError,

        /// <summary>
        /// Unknown error occurred during the operation
        /// </summary>
        UnknownError
    }
}
