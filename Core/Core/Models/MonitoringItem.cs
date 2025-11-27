using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Core.Libs;
using Microsoft.EntityFrameworkCore;

namespace Core.Models;

[Table("items")]
[Index(nameof(PointNumber), IsUnique = true)]
public class MonitoringItem
{
    [Key, Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Required] [Column("item_type")] public ItemType ItemType { get; set; }

    [Column("item_name")] public string? ItemName { get; set; }
    
    [Column("item_name_fa")] public string? ItemNameFa { get; set; }

    [Required]
    [Column("point_number")] public int PointNumber { get; set; }

    [DefaultValue(ShouldScaleType.Off)]
    [Column("should_scale")]
    public ShouldScaleType ShouldScale { get; set; }

    [DefaultValue(0)] [Column("norm_min")] public float NormMin { get; set; }

    [DefaultValue(27648)]
    [Column("norm_max")]
    public float NormMax { get; set; }

    [Required] [Column("scale_min")] public float ScaleMin { get; set; }

    [Required] [Column("scale_max")] public float ScaleMax { get; set; }

    [DefaultValue(4)]
    [Column("save_interval")]
    public int SaveInterval { get; set; }

    [DefaultValue(60)]
    [Column("save_historical_interval")]
    public int SaveHistoricalInterval { get; set; }

    [DefaultValue(ValueCalculationMethod.Default)]
    [Column("calculation_method")]
    public ValueCalculationMethod CalculationMethod { get; set; }

    [DefaultValue(1)]
    [Column("number_of_samples")]
    public int NumberOfSamples { get; set; }

    [DefaultValue(SaveOnChange.Default)]
    [Column("save_on_change")]
    public SaveOnChange SaveOnChange { get; set; }

    [DefaultValue(5)]
    [Column("save_on_change_range")]
    public float SaveOnChangeRange { get; set; }
    
    [Column("on_text")] public string? OnText { get; set; }
    [Column("on_text_fa")] public string? OnTextFa { get; set; }
    [Column("off_text")] public string? OffText { get; set; }
    [Column("off_text_fa")] public string? OffTextFa { get; set; }

    [Column("unit")] public string? Unit { get; set; }
    
    [Column("unit_fa")] public string? UnitFa { get; set; }

    [DefaultValue(false)]
    [Column("is_disabled")] public bool? IsDisabled { get; set; } = false;
    
    
    [DefaultValue(false)]
    [Column("is_calibration_enabled")] public bool? IsCalibrationEnabled { get; set; } = false;
    
    [DefaultValue(1)]
    [Column("calibration_a")]
    public float? CalibrationA { get; set; }
    
    [DefaultValue(0)]
    [Column("calibration_b")]
    public float? CalibrationB { get; set; }
    
    [DefaultValue(InterfaceType.None)]
    [Column("interface_type")]
    public InterfaceType InterfaceType { get; set; }
    
    // Is Editable By User
    [DefaultValue(false)]
    [Column("is_editable")] public bool IsEditable { get; set; } = false;

    public MonitoringItem()
    {
        ShouldScale = ShouldScaleType.Off;
        NormMin = 0;
        NormMax = 27648;
        SaveInterval = 4;
        SaveHistoricalInterval = 60;
        CalculationMethod = ValueCalculationMethod.Default;
        NumberOfSamples = 1;
        SaveOnChange = SaveOnChange.Default;
        SaveOnChangeRange = 5;
        OnText = "";
        OffText = "";
        Unit = "";
    }

    public MonitoringItem(Guid controllerId, ItemType itemType, int pointNumber, int scaleMin,
        int scaleMax) : this()
    {
        ItemType = itemType;
        PointNumber = pointNumber;
        ScaleMin = scaleMin;
        ScaleMax = scaleMax;
    }

    public MonitoringItem(Guid controllerId, ItemType itemType,
        string? itemName, int pointNumber, ShouldScaleType shouldScale,
        int normMin, int normMax, int scaleMin, int scaleMax, int saveInterval, int saveHistoricalInterval,
        ValueCalculationMethod calculationMethod, int numberOfSamples,
        SaveOnChange saveOnChange, float saveOnChangeRange)
    {
        ItemType = itemType;
        ItemName = itemName;
        PointNumber = pointNumber;
        ShouldScale = shouldScale;
        NormMin = normMin;
        NormMax = normMax;
        ScaleMin = scaleMin;
        ScaleMax = scaleMax;
        SaveInterval = saveInterval;
        SaveHistoricalInterval = saveHistoricalInterval;
        CalculationMethod = calculationMethod;
        NumberOfSamples = numberOfSamples;
        SaveOnChange = saveOnChange;
        SaveOnChangeRange = saveOnChangeRange;
    }
}