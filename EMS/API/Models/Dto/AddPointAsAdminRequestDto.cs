using Share.Libs;

namespace API.Models.Dto;

public class AddPointAsAdminRequestDto
{
    public ItemType ItemType { get; set; }
    public string? ItemName { get; set; }
    public int PointNumber { get; set; }
    public ShouldScaleType ShouldScale { get; set; }
    public float NormMin { get; set; }
    public float NormMax { get; set; }
    public float ScaleMin { get; set; }
    public float ScaleMax { get; set; }
    public int SaveInterval { get; set; }
    public int SaveHistoricalInterval { get; set; }
    public ValueCalculationMethod CalculationMethod { get; set; }
    public int NumberOfSamples { get; set; }
    public string? OnText { get; set; }

    public string? OffText { get; set; }
    public string? Unit { get; set; }
    public bool? IsDisabled { get; set; }
}