using Share.Libs;

namespace API.Models.Dto;

/// <summary>
/// Request DTO for adding a monitoring point as admin with full configuration
/// </summary>
public class AddPointAsAdminRequestDto
{
    /// <summary>
    /// Type of the monitoring item (Digital, Analog, etc.)
    /// </summary>
    public ItemType ItemType { get; set; }

    /// <summary>
    /// Display name for the monitoring point
    /// </summary>
    public string? ItemName { get; set; }

    /// <summary>
    /// Point number/address in the controller data block
    /// </summary>
    public int PointNumber { get; set; }

    /// <summary>
    /// Whether the raw value should be scaled to engineering units
    /// </summary>
    public ShouldScaleType ShouldScale { get; set; }

    /// <summary>
    /// Minimum raw value from the controller
    /// </summary>
    public float NormMin { get; set; }

    /// <summary>
    /// Maximum raw value from the controller
    /// </summary>
    public float NormMax { get; set; }

    /// <summary>
    /// Minimum scaled engineering value
    /// </summary>
    public float ScaleMin { get; set; }

    /// <summary>
    /// Maximum scaled engineering value
    /// </summary>
    public float ScaleMax { get; set; }

    /// <summary>
    /// Interval in seconds to save current values
    /// </summary>
    public int SaveInterval { get; set; }

    /// <summary>
    /// Interval in seconds to save historical data
    /// </summary>
    public int SaveHistoricalInterval { get; set; }

    /// <summary>
    /// Method for calculating aggregate values (Average, Min, Max, etc.)
    /// </summary>
    public ValueCalculationMethod CalculationMethod { get; set; }

    /// <summary>
    /// Number of samples to use for calculation method
    /// </summary>
    public int NumberOfSamples { get; set; }

    /// <summary>
    /// Text to display when digital point is ON/True
    /// </summary>
    public string? OnText { get; set; }

    /// <summary>
    /// Text to display when digital point is OFF/False
    /// </summary>
    public string? OffText { get; set; }

    /// <summary>
    /// Engineering unit for the measured value
    /// </summary>
    public string? Unit { get; set; }

    /// <summary>
    /// Whether the monitoring point is disabled
    /// </summary>
    public bool? IsDisabled { get; set; }
}