namespace API.Models.Dto;

/// <summary>
/// Response DTO for deleting a monitoring item operation
/// </summary>
public class DeleteItemResponseDto
{
    /// <summary>
    /// Indicates whether the item was successfully deleted
    /// </summary>
    public bool IsSuccess { get; set; }

    /// <summary>
    /// Optional message providing additional details about the deletion operation
    /// </summary>
    public string? Message { get; set; }
}
