namespace API.Models.Dto;

/// <summary>
/// Request DTO for editing a global variable
/// </summary>
public class EditGlobalVariableRequestDto
{
    /// <summary>
    /// Variable ID to edit
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Variable name (must be unique, alphanumeric with underscore/hyphen only)
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Variable type (0=Boolean, 1=Float)
    /// </summary>
    public int VariableType { get; set; }

    /// <summary>
    /// Optional description explaining the variable's purpose
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Whether this variable is disabled
    /// </summary>
    public bool IsDisabled { get; set; }
}
