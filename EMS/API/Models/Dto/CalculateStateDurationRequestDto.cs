using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for calculating the total duration a digital point held a specific value.
/// </summary>
public class CalculateStateDurationRequestDto : IValidatableObject
{
    /// <summary>
    /// Identifier of the digital point to calculate state duration for.
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
    /// The digital value to calculate duration for ("0" or "1").
    /// </summary>
    [Required(ErrorMessage = "value is required")]
    [JsonPropertyName("value")]
    public string? Value { get; set; }

    /// <summary>
    /// Performs custom validation that cannot be expressed with attributes alone.
    /// Ensures that StartDate is less than or equal to EndDate, ItemId is not whitespace,
    /// and Value is either "0" or "1".
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

        if (Value != "0" && Value != "1")
        {
            yield return new ValidationResult("value must be either '0' or '1'", new[] { nameof(Value) });
        }
    }
}
