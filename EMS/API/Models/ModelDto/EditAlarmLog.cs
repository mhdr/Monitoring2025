using Share.Libs;

namespace API.Models.ModelDto;

public class EditAlarmLog
{
    public bool IsDisabledOld { get; set; }
    public int AlarmDelayOld { get; set; }
    public string? MessageOld { get; set; }
    public string? MessageFaOld { get; set; }
    public string? Value1Old { get; set; }
    public string? Value2Old { get; set; }
    public int? TimeoutOld { get; set; }
    public AlarmType AlarmTypeOld { get; set; }
    public AlarmPriority AlarmPriorityOld { get; set; }
    public CompareType CompareTypeOld { get; set; }
    
    public bool IsDisabledNew { get; set; }
    public int AlarmDelayNew { get; set; }
    public string? MessageNew { get; set; }
    public string? MessageFaNew { get; set; }
    public string? Value1New { get; set; }
    public string? Value2New { get; set; }
    public int? TimeoutNew { get; set; }
    public AlarmType AlarmTypeNew { get; set; }
    public AlarmPriority AlarmPriorityNew { get; set; }
    public CompareType CompareTypeNew { get; set; }
}