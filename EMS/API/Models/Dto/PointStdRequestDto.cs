using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for calculating the standard deviation for an analog point within a time range.
/// </summary>
public class PointStdRequestDto : IValidatableObject
{
    /// <summary>
    /// Identifier of the point to calculate standard deviation for.
    /// </summary>
    [Required(ErrorMessage = "itemId is required")]
    [JsonPropertyName("itemId")]
    public string? ItemId { get; set; }

    /// <summary>
    /// Start time as Unix seconds since epoch (UTC).
    /// If not provided, defaults to 24 hours before EndDate.
    /// </summary>
    [Range(0, long.MaxValue, ErrorMessage = "startDate must be a non-negative Unix timestamp in seconds")]
    [JsonPropertyName("startDate")]
    public long? StartDate { get; set; }

    /// <summary>
    /// End time as Unix seconds since epoch (UTC).
    /// If not provided, defaults to current time.
    /// </summary>
    [Range(0, long.MaxValue, ErrorMessage = "endDate must be a non-negative Unix timestamp in seconds")]
    [JsonPropertyName("endDate")]
    public long? EndDate { get; set; }

    /// <summary>
    /// Performs custom validation that cannot be expressed with attributes alone.
    /// Ensures that StartDate is less than or equal to EndDate and ItemId is not whitespace.
    /// </summary>
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(ItemId))
        {
            yield return new ValidationResult("itemId must not be empty", new[] { nameof(ItemId) });
        }

        if (StartDate.HasValue && EndDate.HasValue && StartDate > EndDate)
        {
            yield return new ValidationResult("startDate must be less than or equal to endDate", new[] { nameof(StartDate), nameof(EndDate) });
        }
    }
}
