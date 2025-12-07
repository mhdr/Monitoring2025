using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for calculating the minimum value grouped by date for an analog point within a time range.
/// </summary>
public class PointMinByDateRequestDto : IValidatableObject
{
    /// <summary>
    /// Identifier of the point to calculate minimum for.
    /// </summary>
    [Required(ErrorMessage = "itemId is required")]
    [JsonPropertyName("itemId")]
    public string? ItemId { get; set; }

    /// <summary>
    /// Start time as Unix seconds since epoch (UTC).
    /// </summary>
    [Range(0, long.MaxValue, ErrorMessage = "startDate must be a non-negative Unix timestamp in seconds")]
    [JsonPropertyName("startDate")]
    public long StartDate { get; set; }

    /// <summary>
    /// End time as Unix seconds since epoch (UTC).
    /// </summary>
    [Range(0, long.MaxValue, ErrorMessage = "endDate must be a non-negative Unix timestamp in seconds")]
    [JsonPropertyName("endDate")]
    public long EndDate { get; set; }

    /// <summary>
    /// Performs custom validation that cannot be expressed with attributes alone.
    /// </summary>
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(ItemId))
        {
            yield return new ValidationResult("itemId must not be empty", new[] { nameof(ItemId) });
        }

        if (StartDate > EndDate)
        {
            yield return new ValidationResult("startDate must be less than or equal to endDate", new[] { nameof(StartDate), nameof(EndDate) });
        }
    }
}
