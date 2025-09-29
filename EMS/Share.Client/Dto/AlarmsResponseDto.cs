using Share.Libs;

namespace Share.Client.Dto;

public class AlarmsResponseDto
{
    public List<Alarm> Data { get; set; }

    public AlarmsResponseDto()
    {
        Data = new();
    }

    public class Alarm
    {
        public string Id { get; set; }
        public string ItemId { get; set; }
        public AlarmType AlarmType { get; set; }
        public AlarmPriority AlarmPriority { get; set; }
        public CompareType CompareType { get; set; }
        public bool IsDisabled { get; set; }
        public int AlarmDelay { get; set; }
        public string? Message { get; set; }
        public string? Value1 { get; set; }
        public string? Value2 { get; set; }
        public int? Timeout { get; set; }
        public bool? HasExternalAlarm { get; set; }
    }
}