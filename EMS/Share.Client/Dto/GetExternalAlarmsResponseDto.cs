namespace Share.Client.Dto;

public class GetExternalAlarmsResponseDto
{
    public List<ExternalAlarm> ExternalAlarms { get; set; } = [];

    public class ExternalAlarm
    {
        public Guid Id { get; set; }
        public Guid AlarmId { get; set; }
        public Guid ItemId { get; set; }
        public bool Value { get; set; }
        public bool IsDisabled { get; set; }
    }
}