namespace Share.Client.ModelDto;

public class EditAlarmLog
{
    public bool IsDisabledOld { get; set; }
    public int AlarmDelayOld { get; set; }
    public string? MessageOld { get; set; }
    public string? Value1Old { get; set; }
    public string? Value2Old { get; set; }
    public int? TimeoutOld { get; set; }
    
    public bool IsDisabledNew { get; set; }
    public int AlarmDelayNew { get; set; }
    public string? MessageNew { get; set; }
    public string? Value1New { get; set; }
    public string? Value2New { get; set; }
    public int? TimeoutNew { get; set; }
}