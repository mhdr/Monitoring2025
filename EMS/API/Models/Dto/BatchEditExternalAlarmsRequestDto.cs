namespace API.Models.Dto;

public class BatchEditExternalAlarmsRequestDto
{
    public Guid AlarmId { get; set; }

    public List<ExternalAlarm> Changed { get; set; } = [];
    public List<ExternalAlarm> Added { get; set; } = [];
    public List<ExternalAlarm> Removed { get; set; } = [];


    public class ExternalAlarm
    {
        public Guid Id { get; set; }
        public Guid ItemId { get; set; }
        public bool Value { get; set; }
        public bool IsDisabled { get; set; }
    }
}