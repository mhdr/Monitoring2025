
namespace Share.Client.Dto;

public class EditAlarmRequestDto
{
    public Guid Id { get; set; }
    public Guid ItemId { get; set; }
    public bool IsDisabled { get; set; }
    public int AlarmDelay { get; set; }
    public string? Message { get; set; }
    public string? Value1 { get; set; }
    public string? Value2 { get; set; }
    public int? Timeout { get; set; }
}