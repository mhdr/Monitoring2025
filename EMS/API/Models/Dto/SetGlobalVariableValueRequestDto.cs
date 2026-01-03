using System.ComponentModel.DataAnnotations;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for setting a global variable's runtime value
/// </summary>
public class SetGlobalVariableValueRequestDto
{
    /// <summary>
    /// Global variable ID
    /// </summary>
    [Required]
    public Guid Id { get; set; }

    /// <summary>
    /// New value to set (must be compatible with variable type)
    /// For Boolean: "true"/"false" or "1"/"0"
    /// For Float: numeric string
    /// </summary>
    [Required]
    public string Value { get; set; } = string.Empty;
}
