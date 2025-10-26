using System.ComponentModel.DataAnnotations;
using Share.Libs;

namespace API.Models.Dto;

/// <summary>
/// Request model for editing a monitoring item's complete configuration
/// </summary>
public class EditItemRequestDto
{
    /// <summary>
    /// Unique identifier of the monitoring item to edit
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    [Required(ErrorMessage = "Item ID is required")]
    public Guid Id { get; set; }

    /// <summary>
    /// Type of the monitoring item (AnalogInput, AnalogOutput, DigitalInput, DigitalOutput)
    /// </summary>
    /// <example>AnalogInput</example>
    [Required(ErrorMessage = "Item type is required")]
    public ItemType ItemType { get; set; }

    /// <summary>
    /// Display name of the monitoring item
    /// </summary>
    /// <example>Temperature Sensor 1</example>
    [Required(ErrorMessage = "Item name is required")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Item name must be between 1 and 200 characters")]
    public string ItemName { get; set; } = string.Empty;

    /// <summary>
    /// Display name of the monitoring item in Farsi
    /// </summary>
    /// <example>دمای سنسور 1</example>
    [StringLength(200, ErrorMessage = "Item name (Farsi) must be less than 200 characters")]
    public string? ItemNameFa { get; set; }

    /// <summary>
    /// Physical point number for controller mapping
    /// </summary>
    /// <example>101</example>
    [Required(ErrorMessage = "Point number is required")]
    [Range(0, int.MaxValue, ErrorMessage = "Point number must be a positive integer")]
    public int PointNumber { get; set; }

    /// <summary>
    /// Indicates if scaling should be applied to the value
    /// </summary>
    /// <example>Yes</example>
    [Required(ErrorMessage = "Should scale setting is required")]
    public ShouldScaleType ShouldScale { get; set; }

    /// <summary>
    /// Minimum value of the normalized range (before scaling)
    /// </summary>
    /// <example>0</example>
    public float NormMin { get; set; }

    /// <summary>
    /// Maximum value of the normalized range (before scaling)
    /// </summary>
    /// <example>100</example>
    public float NormMax { get; set; }

    /// <summary>
    /// Minimum value of the scaled range (after scaling)
    /// </summary>
    /// <example>-50</example>
    public float ScaleMin { get; set; }

    /// <summary>
    /// Maximum value of the scaled range (after scaling)
    /// </summary>
    /// <example>150</example>
    public float ScaleMax { get; set; }

    /// <summary>
    /// Interval in seconds for saving current values
    /// </summary>
    /// <example>60</example>
    [Range(0, int.MaxValue, ErrorMessage = "Save interval must be a positive integer")]
    public int SaveInterval { get; set; }

    /// <summary>
    /// Interval in seconds for saving historical values
    /// </summary>
    /// <example>300</example>
    [Range(0, int.MaxValue, ErrorMessage = "Save historical interval must be a positive integer")]
    public int SaveHistoricalInterval { get; set; }

    /// <summary>
    /// Method used to calculate the value (Average, Last, Min, Max)
    /// </summary>
    /// <example>Average</example>
    [Required(ErrorMessage = "Calculation method is required")]
    public ValueCalculationMethod CalculationMethod { get; set; }

    /// <summary>
    /// Number of samples to use for value calculation
    /// </summary>
    /// <example>10</example>
    [Range(1, int.MaxValue, ErrorMessage = "Number of samples must be at least 1")]
    public int NumberOfSamples { get; set; } = 1;

    /// <summary>
    /// Whether to save data when value changes significantly
    /// </summary>
    public SaveOnChange? SaveOnChange { get; set; }

    /// <summary>
    /// The range threshold for triggering save on change (percentage or absolute value)
    /// </summary>
    /// <example>5</example>
    public float SaveOnChangeRange { get; set; }

    /// <summary>
    /// Text to display when digital value is ON/true
    /// </summary>
    /// <example>Running</example>
    [StringLength(100, ErrorMessage = "On text must be less than 100 characters")]
    public string? OnText { get; set; }

    /// <summary>
    /// Text to display when digital value is ON/true in Farsi
    /// </summary>
    /// <example>روشن</example>
    [StringLength(100, ErrorMessage = "On text (Farsi) must be less than 100 characters")]
    public string? OnTextFa { get; set; }

    /// <summary>
    /// Text to display when digital value is OFF/false
    /// </summary>
    /// <example>Stopped</example>
    [StringLength(100, ErrorMessage = "Off text must be less than 100 characters")]
    public string? OffText { get; set; }

    /// <summary>
    /// Text to display when digital value is OFF/false in Farsi
    /// </summary>
    /// <example>خاموش</example>
    [StringLength(100, ErrorMessage = "Off text (Farsi) must be less than 100 characters")]
    public string? OffTextFa { get; set; }

    /// <summary>
    /// Unit of measurement for the value
    /// </summary>
    /// <example>°C</example>
    [StringLength(50, ErrorMessage = "Unit must be less than 50 characters")]
    public string? Unit { get; set; }

    /// <summary>
    /// Unit of measurement for the value in Farsi
    /// </summary>
    /// <example>درجه سانتی‌گراد</example>
    [StringLength(50, ErrorMessage = "Unit (Farsi) must be less than 50 characters")]
    public string? UnitFa { get; set; }

    /// <summary>
    /// Indicates if the monitoring item is disabled
    /// </summary>
    /// <example>false</example>
    public bool IsDisabled { get; set; }

    /// <summary>
    /// Whether calibration is enabled for this item
    /// </summary>
    /// <example>false</example>
    public bool? IsCalibrationEnabled { get; set; }

    /// <summary>
    /// Calibration coefficient A (multiplier) in the formula: calibrated_value = A * raw_value + B
    /// </summary>
    /// <example>1.0</example>
    public float? CalibrationA { get; set; }

    /// <summary>
    /// Calibration coefficient B (offset) in the formula: calibrated_value = A * raw_value + B
    /// </summary>
    /// <example>0.0</example>
    public float? CalibrationB { get; set; }

    /// <summary>
    /// Communication interface type for this monitoring item (None, Sharp7, BACnet, Modbus)
    /// </summary>
    /// <example>Modbus</example>
    [Required(ErrorMessage = "Interface type is required")]
    public InterfaceType InterfaceType { get; set; }

    /// <summary>
    /// Indicates if the item allows value writes from users
    /// </summary>
    /// <example>true</example>
    public bool IsEditable { get; set; }
}
