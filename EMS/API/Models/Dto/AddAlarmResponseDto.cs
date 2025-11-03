namespace API.Models.Dto;

/// <summary>
/// Response DTO for adding an alarm operation
/// </summary>
public class AddAlarmResponseDto
{
    /// <summary>
    /// Indicates whether the alarm was successfully added
    /// </summary>
    /// <example>true</example>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// Descriptive message about the operation result
    /// </summary>
    /// <example>Alarm created successfully</example>
    public string? Message { get; set; }

    /// <summary>
    /// The unique identifier of the newly created alarm (only present on successful creation)
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    public Guid? AlarmId { get; set; }
}