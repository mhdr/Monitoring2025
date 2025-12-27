using System.Net;
using System.Net.Sockets;
using API.Models.Dto;
using Core.Libs;
using Core.Models;

namespace API.Services;

/// <summary>
/// Provides validation helpers for Modbus gateway configuration.
/// </summary>
public static class GatewayValidationHelper
{
    /// <summary>
    /// Checks if a port can be bound on the system (not in use by another application).
    /// </summary>
    /// <param name="port">The port number to check</param>
    /// <param name="listenIP">The IP address to bind to (default "0.0.0.0")</param>
    /// <returns>True if the port is available, false otherwise</returns>
    public static bool IsPortAvailableOnSystem(int port, string listenIP = "0.0.0.0")
    {
        try
        {
            // Parse the IP address
            if (!IPAddress.TryParse(listenIP, out var ipAddress))
            {
                ipAddress = IPAddress.Any;
            }

            // Try to bind to the port
            using var listener = new TcpListener(ipAddress, port);
            listener.Start();
            listener.Stop();
            return true;
        }
        catch (SocketException)
        {
            // Port is in use
            return false;
        }
        catch (Exception)
        {
            // Some other error occurred, assume port is not available
            return false;
        }
    }

    /// <summary>
    /// Validates mapping address ranges for overlaps within the same register type.
    /// </summary>
    /// <param name="mappings">All mappings to validate (including new, updated, and existing)</param>
    /// <returns>List of validation errors for overlapping ranges</returns>
    public static List<GatewayValidationError> ValidateMappingOverlaps(
        IEnumerable<MappingRange> mappings)
    {
        var errors = new List<GatewayValidationError>();

        // Group mappings by register type
        var groupedByType = mappings.GroupBy(m => m.RegisterType);

        foreach (var group in groupedByType)
        {
            var sortedMappings = group.OrderBy(m => m.StartAddress).ToList();

            for (int i = 0; i < sortedMappings.Count; i++)
            {
                var current = sortedMappings[i];

                for (int j = i + 1; j < sortedMappings.Count; j++)
                {
                    var other = sortedMappings[j];

                    // Check if ranges overlap
                    // Range A [startA, endA) overlaps with Range B [startB, endB) if:
                    // startA < endB && startB < endA
                    if (current.StartAddress < other.EndAddress && other.StartAddress < current.EndAddress)
                    {
                        var registerTypeName = GetRegisterTypeName((ModbusRegisterType)group.Key);
                        errors.Add(GatewayValidationError.MappingOverlap(
                            other.StartAddress, 
                            other.RegisterCount,
                            registerTypeName));
                    }
                }
            }
        }

        return errors;
    }

    /// <summary>
    /// Calculates the register count based on data representation.
    /// </summary>
    /// <param name="dataRepresentation">The data representation type</param>
    /// <returns>Number of registers used</returns>
    public static int CalculateRegisterCount(ModbusDataRepresentation dataRepresentation)
    {
        return dataRepresentation switch
        {
            ModbusDataRepresentation.Float32 => 2,
            ModbusDataRepresentation.Int16 => 1,
            ModbusDataRepresentation.ScaledInteger => 1,
            _ => 1
        };
    }

    private static string GetRegisterTypeName(ModbusRegisterType registerType)
    {
        return registerType switch
        {
            ModbusRegisterType.Coil => "Coils",
            ModbusRegisterType.DiscreteInput => "Discrete Inputs",
            ModbusRegisterType.HoldingRegister => "Holding Registers",
            ModbusRegisterType.InputRegister => "Input Registers",
            _ => "Unknown"
        };
    }
}

/// <summary>
/// Represents a mapping's address range for overlap validation.
/// </summary>
public class MappingRange
{
    public Guid MappingId { get; set; }
    public int StartAddress { get; set; }
    public int RegisterCount { get; set; }
    public int RegisterType { get; set; }

    /// <summary>
    /// End address (exclusive) of the range.
    /// </summary>
    public int EndAddress => StartAddress + RegisterCount;
}
