using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace API.Models.Dto;

/// <summary>
/// Request DTO used to fetch historical values for a single item.
/// </summary>
public class HistoryRequestDto : IValidatableObject
{
    /// <summary>
    /// Identifier of the item to retrieve history for.
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
    /// Ensures that StartDate is less than or equal to EndDate and ItemId is not whitespace.
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