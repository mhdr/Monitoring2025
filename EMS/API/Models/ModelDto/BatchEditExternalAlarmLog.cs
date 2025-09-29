namespace API.Models.ModelDto;

public class BatchEditExternalAlarmLog
{
    public Guid Id { get; set; }
    public Guid AlarmId { get; set; }
    public Guid ItemId { get; set; }
    public bool Value { get; set; }
    public bool IsDisabled { get; set; }
}