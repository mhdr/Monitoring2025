using Core.Libs;

namespace ModbusGateway;

/// <summary>
/// Provides conversion methods for Modbus data representations.
/// Handles Int16, Float32, and ScaledInteger conversions with various endianness options.
/// </summary>
public static class DataConversionHelper
{
    #region Float32 Conversion

    /// <summary>
    /// Converts a float value to two 16-bit registers according to the specified endianness.
    /// </summary>
    /// <param name="value">The float value to convert.</param>
    /// <param name="endianness">The byte/word ordering to use.</param>
    /// <returns>Array of two UInt16 values representing the float.</returns>
    public static ushort[] FloatToRegisters(float value, Endianness endianness)
    {
        byte[] bytes = BitConverter.GetBytes(value);
        
        // Rearrange bytes based on endianness
        bytes = ApplyEndianness(bytes, endianness);
        
        // Convert to two 16-bit registers
        ushort[] registers = new ushort[2];
        registers[0] = (ushort)((bytes[0] << 8) | bytes[1]);
        registers[1] = (ushort)((bytes[2] << 8) | bytes[3]);
        
        return registers;
    }

    /// <summary>
    /// Converts two 16-bit registers to a float value according to the specified endianness.
    /// </summary>
    /// <param name="registers">Array of two UInt16 values.</param>
    /// <param name="endianness">The byte/word ordering used.</param>
    /// <returns>The float value.</returns>
    public static float RegistersToFloat(ushort[] registers, Endianness endianness)
    {
        if (registers.Length < 2)
            throw new ArgumentException("Float32 requires 2 registers", nameof(registers));

        // Extract bytes from registers (big-endian within each register)
        byte[] bytes = new byte[4];
        bytes[0] = (byte)(registers[0] >> 8);
        bytes[1] = (byte)(registers[0] & 0xFF);
        bytes[2] = (byte)(registers[1] >> 8);
        bytes[3] = (byte)(registers[1] & 0xFF);
        
        // Reverse the endianness transformation to get native byte order
        bytes = ReverseEndianness(bytes, endianness);
        
        return BitConverter.ToSingle(bytes, 0);
    }

    /// <summary>
    /// Applies endianness transformation from native (little-endian on most systems) to wire format.
    /// </summary>
    private static byte[] ApplyEndianness(byte[] bytes, Endianness endianness)
    {
        byte[] result = new byte[4];
        
        switch (endianness)
        {
            case Endianness.BigEndian:
                // Big-Endian Word Order + Big-Endian Byte Order (AB CD)
                // Native little-endian: bytes[0]=LSB, bytes[3]=MSB
                // Output: MSB first -> bytes[3], bytes[2], bytes[1], bytes[0]
                result[0] = bytes[3];
                result[1] = bytes[2];
                result[2] = bytes[1];
                result[3] = bytes[0];
                break;
                
            case Endianness.LittleEndian:
                // Little-Endian Word Order + Little-Endian Byte Order (DC BA)
                // Native order is already little-endian, but we need to swap words
                result[0] = bytes[2];
                result[1] = bytes[3];
                result[2] = bytes[0];
                result[3] = bytes[1];
                break;
                
            case Endianness.MidBigEndian:
                // Little-Endian Word Order + Big-Endian Byte Order (CD AB)
                result[0] = bytes[1];
                result[1] = bytes[0];
                result[2] = bytes[3];
                result[3] = bytes[2];
                break;
                
            case Endianness.MidLittleEndian:
                // Big-Endian Word Order + Little-Endian Byte Order (BA DC)
                result[0] = bytes[2];
                result[1] = bytes[3];
                result[2] = bytes[0];
                result[3] = bytes[1];
                break;
                
            default:
                // Default to BigEndian
                result[0] = bytes[3];
                result[1] = bytes[2];
                result[2] = bytes[1];
                result[3] = bytes[0];
                break;
        }
        
        return result;
    }

    /// <summary>
    /// Reverses endianness transformation from wire format back to native.
    /// </summary>
    private static byte[] ReverseEndianness(byte[] bytes, Endianness endianness)
    {
        byte[] result = new byte[4];
        
        switch (endianness)
        {
            case Endianness.BigEndian:
                // Reverse of BigEndian transformation
                result[0] = bytes[3];
                result[1] = bytes[2];
                result[2] = bytes[1];
                result[3] = bytes[0];
                break;
                
            case Endianness.LittleEndian:
                // Reverse of LittleEndian transformation
                result[0] = bytes[2];
                result[1] = bytes[3];
                result[2] = bytes[0];
                result[3] = bytes[1];
                break;
                
            case Endianness.MidBigEndian:
                // Reverse of MidBigEndian transformation
                result[0] = bytes[1];
                result[1] = bytes[0];
                result[2] = bytes[3];
                result[3] = bytes[2];
                break;
                
            case Endianness.MidLittleEndian:
                // Reverse of MidLittleEndian transformation
                result[0] = bytes[2];
                result[1] = bytes[3];
                result[2] = bytes[0];
                result[3] = bytes[1];
                break;
                
            default:
                // Default to BigEndian
                result[0] = bytes[3];
                result[1] = bytes[2];
                result[2] = bytes[1];
                result[3] = bytes[0];
                break;
        }
        
        return result;
    }

    #endregion

    #region Int16 Conversion

    /// <summary>
    /// Converts a value to a single 16-bit register.
    /// </summary>
    /// <param name="value">The value to convert (will be clamped to Int16 range).</param>
    /// <returns>The UInt16 register value.</returns>
    public static ushort ValueToInt16Register(float value)
    {
        // Clamp to Int16 range and convert
        int intValue = (int)Math.Round(value);
        intValue = Math.Clamp(intValue, short.MinValue, short.MaxValue);
        return (ushort)(short)intValue;
    }

    /// <summary>
    /// Converts a 16-bit register to a float value.
    /// </summary>
    /// <param name="register">The register value (interpreted as signed Int16).</param>
    /// <returns>The float value.</returns>
    public static float Int16RegisterToValue(ushort register)
    {
        return (short)register;
    }

    #endregion

    #region ScaledInteger Conversion

    /// <summary>
    /// Converts a value to a scaled 16-bit unsigned register (0-65535 range).
    /// </summary>
    /// <param name="value">The actual value.</param>
    /// <param name="scaleMin">The minimum scale value (maps to 0).</param>
    /// <param name="scaleMax">The maximum scale value (maps to 65535).</param>
    /// <returns>The scaled UInt16 register value.</returns>
    public static ushort ValueToScaledRegister(float value, float scaleMin, float scaleMax)
    {
        if (Math.Abs(scaleMax - scaleMin) < float.Epsilon)
        {
            // Avoid division by zero
            return 0;
        }

        // Clamp value to scale range
        value = Math.Clamp(value, scaleMin, scaleMax);
        
        // Map to 0-65535 range
        float normalized = (value - scaleMin) / (scaleMax - scaleMin);
        int scaled = (int)Math.Round(normalized * 65535.0f);
        scaled = Math.Clamp(scaled, 0, 65535);
        
        return (ushort)scaled;
    }

    /// <summary>
    /// Converts a scaled 16-bit unsigned register (0-65535) back to the actual value.
    /// </summary>
    /// <param name="register">The scaled register value (0-65535).</param>
    /// <param name="scaleMin">The minimum scale value (maps from 0).</param>
    /// <param name="scaleMax">The maximum scale value (maps from 65535).</param>
    /// <returns>The actual float value.</returns>
    public static float ScaledRegisterToValue(ushort register, float scaleMin, float scaleMax)
    {
        // Map from 0-65535 range back to scaleMin-scaleMax
        float normalized = register / 65535.0f;
        return normalized * (scaleMax - scaleMin) + scaleMin;
    }

    #endregion

    #region Boolean Conversion

    /// <summary>
    /// Converts a boolean value to a coil state.
    /// </summary>
    /// <param name="value">The boolean value.</param>
    /// <returns>True for ON (1), False for OFF (0).</returns>
    public static bool ValueToCoil(float value)
    {
        return value != 0;
    }

    /// <summary>
    /// Converts a string value to a coil state.
    /// </summary>
    /// <param name="value">The string value ("true", "1", etc.).</param>
    /// <returns>True for ON, False for OFF.</returns>
    public static bool StringValueToCoil(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return false;
            
        if (bool.TryParse(value, out bool boolResult))
            return boolResult;
            
        if (float.TryParse(value, out float floatResult))
            return floatResult != 0;
            
        return false;
    }

    /// <summary>
    /// Converts a coil state to a string value.
    /// </summary>
    /// <param name="coilState">The coil state.</param>
    /// <returns>"1" for ON, "0" for OFF.</returns>
    public static string CoilToStringValue(bool coilState)
    {
        return coilState ? "1" : "0";
    }

    #endregion

    #region Value Parsing

    /// <summary>
    /// Parses a string value to float for Modbus conversion.
    /// </summary>
    /// <param name="value">The string value to parse.</param>
    /// <returns>The float value, or 0 if parsing fails.</returns>
    public static float ParseStringValue(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return 0;
            
        if (float.TryParse(value, out float result))
            return result;
            
        if (bool.TryParse(value, out bool boolResult))
            return boolResult ? 1 : 0;
            
        return 0;
    }

    /// <summary>
    /// Formats a float value as a string for storage.
    /// </summary>
    /// <param name="value">The float value.</param>
    /// <returns>The string representation.</returns>
    public static string FormatValueAsString(float value)
    {
        return value.ToString(System.Globalization.CultureInfo.InvariantCulture);
    }

    #endregion

    #region Register Count Calculation

    /// <summary>
    /// Gets the number of registers required for a data representation.
    /// </summary>
    /// <param name="representation">The data representation type.</param>
    /// <returns>Number of 16-bit registers required.</returns>
    public static int GetRegisterCount(ModbusDataRepresentation representation)
    {
        return representation switch
        {
            ModbusDataRepresentation.Int16 => 1,
            ModbusDataRepresentation.Float32 => 2,
            ModbusDataRepresentation.ScaledInteger => 1,
            _ => 1
        };
    }

    #endregion
}
