namespace API.Models.Dto;

/// <summary>
/// Response model for group move operation
/// </summary>
public class MoveGroupResponseDto
{
    /// <summary>
    /// Indicates whether the operation was successful
    /// </summary>
    public bool IsSuccessful { get; set; }
    
    /// <summary>
    /// Descriptive message about the operation result
    /// </summary>
    public string? Message { get; set; }
    
    /// <summary>
    /// Error type if the operation failed
    /// </summary>
    public MoveGroupErrorType? Error { get; set; }
    
    /// <summary>
    /// Types of errors that can occur during group move operation
    /// </summary>
    public enum MoveGroupErrorType
    {
        /// <summary>Group not found</summary>
        GroupNotFound,
        
        /// <summary>Parent group not found</summary>
        ParentGroupNotFound,
        
        /// <summary>Cannot move group to itself</summary>
        CannotMoveToSelf,
        
        /// <summary>Cannot move group to one of its descendants (circular reference)</summary>
        CircularReference,
        
        /// <summary>Validation error</summary>
        ValidationError,
        
        /// <summary>Unknown error</summary>
        UnknownError
    }
}