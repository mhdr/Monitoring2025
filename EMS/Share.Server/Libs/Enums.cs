namespace Share.Server.Libs;

public enum AlarmType
{
    Comparative = 1,
    Timeout = 2,
}

public enum CompareType
{
    Equal = 1,
    NotEqual = 2,
    Higher = 3,
    Lower = 4,
    Between = 5,
}

public enum AlarmPriority
{
    Warning = 1,
    Alarm = 2,
}

public enum ItemType
{
    DigitalInput = 1,
    DigitalOutput = 2,
    AnalogInput = 3,
    AnalogOutput = 4,
}

public enum LogType
{
    EditPoint = 1,
    EditAlarm = 2,
    Login = 3,
    Logout = 4,
    EditGroup = 5,
    AddAlarm = 6,
    DeleteAlarm = 7,
    AddExternalAlarm = 8,
    DeleteExternalAlarm = 9,
    EditExternalAlarm = 10,
}

public enum DataType
{
    Bit = 1,
    Real = 2,
    Integer = 3,
}

public enum ControllerType
{
    Sharp7 = 1,
}

public enum ShouldScaleType
{
    On = 1,
    Off = 2,
}

public enum ValueCalculationMethod
{
    Default = 0,
    Mean = 1,
}

public enum SaveOnChange
{
    Default = 0,
    On = 1,
    Off = 2,
}

public enum IoOperationType
{
    Read=1,
    Write=2,
}

public enum InterfaceType
{
    None = 0,
    Sharp7 = 1,
    BACnet = 2,
}