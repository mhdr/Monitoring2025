namespace Core.Libs;

public enum ItemType
{
    DigitalInput = 1,
    DigitalOutput = 2,
    AnalogInput = 3,
    AnalogOutput = 4,
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

public enum ShouldScaleType
{
    On = 1,
    Off = 2,
}

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

public enum DataType
{
    Bit = 1,
    Real = 2,
    Integer = 3,
}

public enum IoOperationType
{
    Read = 1,
    Write = 2,
}

public enum BACnetObjectType
{
    AnalogInput = 1,
    AnalogOutput = 2,
}

public enum InterfaceType
{
    None = 0,
    Sharp7 = 1,
    BACnet = 2,
    Modbus = 3,
}

public enum ModbusDataType
{
    Boolean = 1,
    Int = 2,
    Float = 3,
}

/// <summary>
/// Specifies the byte and word order for multi-byte data types.
/// </summary>
/// <remarks>
/// | Value           | Word Order | Byte Order | Example (0x12345678)  |
/// |-----------------|------------|------------|-----------------------|
/// | BigEndian       | Big        | Big        | 12 34 56 78 (AB CD)   |
/// | LittleEndian    | Little     | Little     | 78 56 34 12 (DC BA)   |
/// | MidBigEndian    | Little     | Big        | 56 78 12 34 (CD AB)   |
/// | MidLittleEndian | Big        | Little     | 34 12 78 56 (BA DC)   |
/// </remarks>
public enum Endianness
{
    None = 0,
    /// <summary>Big-Endian Word Order + Big-Endian Byte Order (AB CD)</summary>
    BigEndian = 1,
    /// <summary>Little-Endian Word Order + Little-Endian Byte Order (DC BA)</summary>
    LittleEndian = 2,
    /// <summary>Little-Endian Word Order + Big-Endian Byte Order (CD AB)</summary>
    MidBigEndian = 3,
    /// <summary>Big-Endian Word Order + Little-Endian Byte Order (BA DC)</summary>
    MidLittleEndian = 4,
}

public enum ModbusConnectionType
{
    TCP = 1,
    TcpoverRTU = 2,
}

public enum MyModbusType
{
    None = 0,
    ASCII = 1,
    RTU = 2,
}

/// <summary>
/// Specifies the address base convention for Modbus registers.
/// </summary>
/// <remarks>
/// | Value    | Convention | Example: Register 3027          |
/// |----------|------------|----------------------------------|
/// | Base0    | 0-based    | Enter 3027 → Protocol addr 3027  |
/// | Base1    | 1-based    | Enter 3028 → Protocol addr 3027  |
/// | Base40001| Modbus std | Enter 43028 → Protocol addr 3027 |
/// | Base40000| Alt std    | Enter 43027 → Protocol addr 3027 |
/// </remarks>
public enum ModbusAddressBase
{
    /// <summary>0-based addressing. Address entered = protocol address.</summary>
    Base0 = 0,
    /// <summary>1-based addressing. Protocol address = entered address - 1.</summary>
    Base1 = 1,
    /// <summary>Standard Modbus: 40001 = register 0. Protocol address = entered - 40001.</summary>
    Base40001 = 2,
    /// <summary>Alternative: 40000 = register 0. Protocol address = entered - 40000.</summary>
    Base40000 = 3,
}

/// <summary>
/// Specifies the Modbus register type for gateway mappings.
/// </summary>
public enum ModbusRegisterType
{
    /// <summary>Single bit read/write (function codes 01, 05, 15)</summary>
    Coil = 1,
    /// <summary>Single bit read-only (function code 02)</summary>
    DiscreteInput = 2,
    /// <summary>16-bit register read/write (function codes 03, 06, 16)</summary>
    HoldingRegister = 3,
    /// <summary>16-bit register read-only (function code 04)</summary>
    InputRegister = 4,
}

/// <summary>
/// Specifies the data representation format for Modbus gateway register mappings.
/// </summary>
public enum ModbusDataRepresentation
{
    /// <summary>16-bit signed integer. Uses 1 register.</summary>
    Int16 = 1,
    /// <summary>32-bit floating point IEEE 754. Uses 2 registers.</summary>
    Float32 = 2,
    /// <summary>Scaled integer: value mapped to 0-65535 range using ScaleMin/ScaleMax. Uses 1 register.</summary>
    ScaledInteger = 3,
}

/// <summary>
/// Specifies the outlier detection method for AverageMemory processing.
/// </summary>
public enum OutlierMethod
{
    /// <summary>No outlier detection - use all valid inputs</summary>
    None = 0,
    /// <summary>Interquartile Range (IQR) method - removes values outside Q1-k*IQR to Q3+k*IQR (robust, recommended)</summary>
    IQR = 1,
    /// <summary>Z-Score method - removes values with |z-score| > threshold (assumes normal distribution)</summary>
    ZScore = 2,
}