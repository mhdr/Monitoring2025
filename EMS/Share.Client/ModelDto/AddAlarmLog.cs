using Share.Libs;

namespace Share.Client.ModelDto;

public class AddAlarmLog
{
    public Guid ItemId { get; set; }
    public AlarmType AlarmType { get; set; }
    public AlarmPriority AlarmPriority { get; set; }
    public CompareType CompareType { get; set; }
    public bool IsDisabled { get; set; } = false;
    public int AlarmDelay { get; set; }
    public string? Message { get; set; }
    public string? Value1 { get; set; }
    public string? Value2 { get; set; }
    public int? Timeout { get; set; }
    public bool? HasExternalAlarm { get; set; }
}