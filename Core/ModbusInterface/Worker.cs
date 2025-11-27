using System.Net;
using System.Net.Sockets;
using Contracts;
using Core.Libs;
using Core.Models;
using FluentModbus;
using MassTransit;

namespace ModbusInterface;

public class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;
    private readonly IBus _bus;
    private List<MonitoringItem>? _items;
    private long _itemsUpdateTime;
    private readonly object _itemsLock = new object();

    public Worker(ILogger<Worker> logger, IBus bus)
    {
        _logger = logger;
        _bus = bus;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (_logger.IsEnabled(LogLevel.Information))
                {
                    _logger.LogInformation("Worker running at: {time}", DateTimeOffset.Now);
                }

                _logger.LogInformation("Fetching Modbus controllers from database...");
                var controllers = await Core.Controllers.GetModbusControllers(x => x.IsDisabled == false);
                _logger.LogInformation("Found {ControllerCount} enabled Modbus controllers", controllers.Count);

                if (controllers.Count == 0)
                {
                    _logger.LogWarning("No enabled Modbus controllers found in database");
                    await Task.Delay(1000, stoppingToken);
                    continue;
                }

                var grouped = controllers.GroupBy(x => x.IPAddress);
                _logger.LogInformation("Grouped controllers into {GroupCount} IP addresses", grouped.Count());

                _logger.LogInformation("Fetching monitoring items from database...");
                await FetchItems();

                lock (_itemsLock)
                {
                    _logger.LogInformation("Loaded {ItemCount} monitoring items from database", _items?.Count ?? 0);
                    if (_items != null && _items.Count > 0)
                    {
                        foreach (var item in _items)
                        {
                            _logger.LogInformation("Monitoring Item - Id: {ItemId}", item.Id);
                        }
                    }
                }

                var tasks = new List<Task>();

                foreach (var group in grouped)
                {
                    _logger.LogInformation("Processing IP group: {IPAddress} with {ControllerCount} controllers",
                        group.Key, group.Count());
                    tasks.Add(ReadWrite(group));
                }

                await Task.WhenAll(tasks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fatal error in ExecuteAsync main loop");
            }

            await Task.Delay(1000, stoppingToken);
        }
    }

    private async Task FetchItems()
    {
        try
        {
            DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
            long epochTime = currentTimeUtc.ToUnixTimeSeconds();

            lock (_itemsLock)
            {
                if (_items == null || epochTime - _itemsUpdateTime > 60)
                {
                    // Release the lock while awaiting the async operation
                }
            }

            // Check again after potentially waiting for other threads
            List<MonitoringItem>? currentItems = null;
            long currentUpdateTime = 0;

            lock (_itemsLock)
            {
                currentItems = _items;
                currentUpdateTime = _itemsUpdateTime;
            }

            if (currentItems == null || epochTime - currentUpdateTime > 60)
            {
                _logger.LogInformation("Calling Core.Points.GetAllPoints()...");
                var fetchedItems = await Core.Points.GetAllPoints();
                _logger.LogInformation("Core.Points.GetAllPoints() returned {Count} items", fetchedItems?.Count ?? 0);

                lock (_itemsLock)
                {
                    _items = fetchedItems;
                    _itemsUpdateTime = epochTime;
                }
            }
            else
            {
                _logger.LogDebug("Using cached monitoring items (cache age: {Age} seconds)",
                    epochTime - currentUpdateTime);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in FetchItems");
            throw;
        }
    }

    private async Task ReadWrite(IGrouping<string, ControllerModbus> group)
    {
        foreach (var controller in group)
        {
            try
            {
                _logger.LogInformation(
                    "Processing controller {ControllerId} - Type: {DataType}, Address: {IPAddress}:{Port}, StartAddr: {StartAddress}, Length: {DataLength}",
                    controller.Id, controller.DataType, controller.IPAddress, controller.Port, controller.StartAddress,
                    controller.DataLength);

                if (controller.DataType == ModbusDataType.Boolean)
                {
                    await WriteBoolean(controller);
                    await ReadBoolean(controller);
                }
                else if (controller.DataType == ModbusDataType.Int)
                {
                    await WriteInt(controller);
                    await ReadInt(controller);
                }
                else if (controller.DataType == ModbusDataType.Float)
                {
                    await WriteFloat(controller);
                    await ReadFloat(controller);
                }

                _logger.LogInformation("Successfully processed controller {ControllerId}", controller.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing controller {ControllerId} at {IPAddress}:{Port}",
                    controller.Id, controller.IPAddress, controller.Port);
            }
        }
    }

    /// <summary>
    /// Creates and connects a Modbus client based on the controller's ConnectionType, ModbusType, and Endianness.
    /// </summary>
    /// <param name="controller">The controller configuration</param>
    /// <returns>A connected ModbusClient</returns>
    private ModbusClient CreateAndConnectClient(ControllerModbus controller)
    {
        var connectionType = controller.ConnectionType ?? ModbusConnectionType.TCP;
        var modbusType = controller.ModbusType ?? MyModbusType.None;
        var endianness = controller.Endianness ?? Endianness.None;

        // Map Core.Libs.Endianness to FluentModbus.ModbusEndianness
        var modbusEndianness = endianness switch
        {
            Endianness.LittleEndian => ModbusEndianness.LittleEndian,
            _ => ModbusEndianness.BigEndian // BigEndian, MidBigEndian, MidLittleEndian, None all default to BigEndian
        };

        _logger.LogInformation(
            "Creating Modbus client - ConnectionType: {ConnectionType}, ModbusType: {ModbusType}, Endianness: {Endianness}",
            connectionType, modbusType, endianness);

        if (connectionType == ModbusConnectionType.TcpoverRTU)
        {
            // Use RTU over TCP client
            var rtuClient = new ModbusRtuOverTcpClient();
            rtuClient.Connect(new IPEndPoint(IPAddress.Parse(controller.IPAddress), controller.Port),
                modbusEndianness);
            return rtuClient;
        }
        else
        {
            // Standard TCP client
            var tcpClient = new ModbusTcpClient();
            tcpClient.Connect(new IPEndPoint(IPAddress.Parse(controller.IPAddress), controller.Port),
                modbusEndianness);
            return tcpClient;
        }
    }

    /// <summary>
    /// Converts a configured address to the protocol address based on the controller's AddressBase setting.
    /// </summary>
    /// <param name="configuredAddress">The address as configured in the database</param>
    /// <param name="addressBase">The addressing convention used</param>
    /// <returns>The 0-based protocol address to send to the device</returns>
    private int ConvertToProtocolAddress(int configuredAddress, ModbusAddressBase? addressBase)
    {
        var baseMode = addressBase ?? ModbusAddressBase.Base0;
        
        return baseMode switch
        {
            ModbusAddressBase.Base0 => configuredAddress,                    // Direct: 3027 -> 3027
            ModbusAddressBase.Base1 => configuredAddress - 1,                // 1-based: 3028 -> 3027
            ModbusAddressBase.Base40001 => configuredAddress - 40001,        // Modbus std: 43028 -> 3027
            ModbusAddressBase.Base40000 => configuredAddress - 40000,        // Alt std: 43027 -> 3027
            _ => configuredAddress
        };
    }

    private async Task WriteInt(ControllerModbus controller)
    {
        ModbusClient? client = null;

        try
        {
            var maps = await Core.Controllers.GetModbusMaps(x => x.ControllerId == controller.Id &&
                                                                 x.OperationType == IoOperationType.Write);

            _logger.LogInformation("WriteInt - Controller {ControllerId}: Found {MapCount} write maps",
                controller.Id, maps.Count);

            if (maps.Count == 0)
            {
                _logger.LogInformation("WriteInt - Controller {ControllerId}: No write maps configured, skipping",
                    controller.Id);
                return; // No maps to write, exit early
            }

            var values = await Core.Points.GetWriteItems();
            _logger.LogInformation(
                "WriteInt - Controller {ControllerId}: Retrieved {ValueCount} write items from database",
                controller.Id, values.Count);

            // use specified IP address and port
            _logger.LogInformation("WriteInt - Controller {ControllerId}: Connecting to {IPAddress}:{Port} (ConnectionType: {ConnectionType}, ModbusType: {ModbusType})",
                controller.Id, controller.IPAddress, controller.Port, controller.ConnectionType, controller.ModbusType);

            client = CreateAndConnectClient(controller);

            _logger.LogInformation("WriteInt - Controller {ControllerId}: Connected successfully", controller.Id);

            var unitIdentifier = controller.UnitIdentifier ?? 1; // Use configured unit/slave ID (0-247), default to 1

            var startingAddress = controller.StartAddress;
            var count = controller.DataLength;
            
            // Convert configured address to protocol address
            var protocolAddress = ConvertToProtocolAddress(startingAddress, controller.AddressBase);

            var intData = new short[count];
            var mappedCount = 0;

            // Determine if maps use relative positioning (0-based offset from StartAddress) or absolute positioning
            var minAbsolutePosition = controller.StartAddress;
            var maxAbsolutePosition = controller.StartAddress + controller.DataLength - 1;
            var usesAbsolutePositioning = maps.Any(m => m.Position >= minAbsolutePosition && m.Position <= maxAbsolutePosition);

            for (int i = 0; i < count; i++)
            {
                var absolutePosition = controller.StartAddress + i;
                var relativePosition = i;
                
                var map = usesAbsolutePositioning 
                    ? maps.FirstOrDefault(x => x.Position == absolutePosition)
                    : maps.FirstOrDefault(x => x.Position == relativePosition);
                if (map == null) continue;

                var item = _items?.FirstOrDefault(x => x.Id == map.ItemId);
                if (item == null)
                {
                    _logger.LogWarning(
                        "WriteInt - Controller {ControllerId}: Item not found for map ItemId {ItemId} at position {Position}",
                        controller.Id, map.ItemId, absolutePosition);
                    continue;
                }

                var matched = values.FirstOrDefault(x => x.ItemId == map.ItemId);
                string? value = "0";

                if (matched != null)
                {
                    // Skip this write item if it has expired: compare current epoch seconds to the item's timestamp + duration.
                    // Duration of 0 means infinite write (never expires).
                    DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
                    long epochTime = currentTimeUtc.ToUnixTimeSeconds();

                    if (matched.DurationSeconds > 0 && epochTime - matched.Time > matched.DurationSeconds)
                    {
                        continue;
                    }

                    var denormalized = GetDenormalizedValue(item, matched);
                    value = denormalized.Value;
                }

                if (float.TryParse(value, out float floatValue))
                {
                    // Convert float to short, checking for overflow
                    short intValue;
                    if (floatValue > short.MaxValue)
                    {
                        intValue = short.MaxValue;
                        _logger.LogWarning(
                            "WriteInt - Controller {ControllerId}: Value '{Value}' for ItemId {ItemId} exceeds short.MaxValue ({MaxValue}), clamping to {ClampedValue}",
                            controller.Id, value, map.ItemId, short.MaxValue, intValue);
                    }
                    else if (floatValue < short.MinValue)
                    {
                        intValue = short.MinValue;
                        _logger.LogWarning(
                            "WriteInt - Controller {ControllerId}: Value '{Value}' for ItemId {ItemId} below short.MinValue ({MinValue}), clamping to {ClampedValue}",
                            controller.Id, value, map.ItemId, short.MinValue, intValue);
                    }
                    else
                    {
                        intValue = (short)Math.Round(floatValue);
                    }
                    
                    intData[i] = intValue;
                    mappedCount++;
                    _logger.LogDebug(
                        "WriteInt - Controller {ControllerId}: Writing ItemId {ItemId} value {Value} (parsed from '{OriginalValue}') to position {Position}",
                        controller.Id, map.ItemId, intValue, value, absolutePosition);
                }
                else
                {
                    intData[i] = 0;
                    _logger.LogWarning(
                        "WriteInt - Controller {ControllerId}: Invalid value '{Value}' for ItemId {ItemId}, writing 0",
                        controller.Id, value, map.ItemId);
                }
            }

            _logger.LogInformation(
                "WriteInt - Controller {ControllerId}: Writing {MappedCount} values to registers starting at protocol address {ProtocolAddress} (configured: {StartAddress})",
                controller.Id, mappedCount, protocolAddress, startingAddress);

            // Write 'count' holding registers starting at protocol address.
            await client.WriteMultipleRegistersAsync(unitIdentifier, protocolAddress,
                intData); // array of 16-bit register values

            _logger.LogInformation("WriteInt - Controller {ControllerId}: Write completed successfully", controller.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error writing Int values to controller {ControllerId} at {IPAddress}:{Port}",
                controller.Id, controller.IPAddress, controller.Port);
            throw; // Re-throw to be caught by the calling method's exception handling
        }
        finally
        {
            try
            {
                (client as IDisposable)?.Dispose();
            }
            catch
            {
                // Ignore disconnect errors to ensure cleanup continues
            }
        }
    }

    private WriteItem GetDenormalizedValue(MonitoringItem item, WriteItem value)
    {
        if (item.ShouldScale == ShouldScaleType.On)
        {
            float denormalizedValue = MinMaxNormalizer.Denormalize(
                Convert.ToSingle(value.Value), item.NormMin, item.NormMax, item.ScaleMin, item.ScaleMax);
            value.Value = denormalizedValue.ToString("F2");
        }

        return value;
    }

    private async Task WriteBoolean(ControllerModbus controller)
    {
        ModbusClient? client = null;

        try
        {
            var maps = await Core.Controllers.GetModbusMaps(x => x.ControllerId == controller.Id &&
                                                                 x.OperationType == IoOperationType.Write);

            _logger.LogInformation("WriteBoolean - Controller {ControllerId}: Found {MapCount} write maps",
                controller.Id, maps.Count);

            if (maps.Count == 0)
            {
                _logger.LogInformation("WriteBoolean - Controller {ControllerId}: No write maps configured, skipping",
                    controller.Id);
                return; // No maps to write, exit early
            }

            var values = await Core.Points.GetWriteItems();
            _logger.LogInformation(
                "WriteBoolean - Controller {ControllerId}: Retrieved {ValueCount} write items from database",
                controller.Id, values.Count);

            // use specified IP address and port
            _logger.LogInformation("WriteBoolean - Controller {ControllerId}: Connecting to {IPAddress}:{Port} (ConnectionType: {ConnectionType}, ModbusType: {ModbusType})",
                controller.Id, controller.IPAddress, controller.Port, controller.ConnectionType, controller.ModbusType);

            client = CreateAndConnectClient(controller);

            _logger.LogInformation("WriteBoolean - Controller {ControllerId}: Connected successfully", controller.Id);

            var unitIdentifier = controller.UnitIdentifier ?? 1; // Use configured unit/slave ID (0-247), default to 1

            var startingAddress = controller.StartAddress;
            var count = controller.DataLength;
            
            // Convert configured address to protocol address
            var protocolAddress = ConvertToProtocolAddress(startingAddress, controller.AddressBase);

            var boolData = new bool[count];
            var mappedCount = 0;

            // Determine if maps use relative positioning (0-based offset from StartAddress) or absolute positioning
            var minAbsolutePosition = controller.StartAddress;
            var maxAbsolutePosition = controller.StartAddress + controller.DataLength - 1;
            var usesAbsolutePositioning = maps.Any(m => m.Position >= minAbsolutePosition && m.Position <= maxAbsolutePosition);

            for (int i = 0; i < count; i++)
            {
                var absolutePosition = controller.StartAddress + i;
                var relativePosition = i;
                
                var map = usesAbsolutePositioning 
                    ? maps.FirstOrDefault(x => x.Position == absolutePosition)
                    : maps.FirstOrDefault(x => x.Position == relativePosition);
                if (map == null) continue;

                var item = _items?.FirstOrDefault(x => x.Id == map.ItemId);
                if (item == null)
                {
                    _logger.LogWarning(
                        "WriteBoolean - Controller {ControllerId}: Item not found for map ItemId {ItemId} at position {Position}",
                        controller.Id, map.ItemId, absolutePosition);
                    continue;
                }

                var matched = values.FirstOrDefault(x => x.ItemId == map.ItemId);
                string? value = "0";

                if (matched != null)
                {
                    
                    // Skip this write item if it has expired: compare current epoch seconds to the item's timestamp + duration.
                    // Duration of 0 means infinite write (never expires).
                    DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
                    long epochTime = currentTimeUtc.ToUnixTimeSeconds();

                    if (matched.DurationSeconds > 0 && epochTime - matched.Time > matched.DurationSeconds)
                    {
                        continue;
                    }

                    value = matched.Value;
                }

                if (value == "1")
                {
                    boolData[i] = true;
                    mappedCount++;
                    _logger.LogDebug(
                        "WriteBoolean - Controller {ControllerId}: Writing ItemId {ItemId} value true to position {Position}",
                        controller.Id, map.ItemId, absolutePosition);
                }
                else
                {
                    boolData[i] = false;
                    mappedCount++;
                    _logger.LogDebug(
                        "WriteBoolean - Controller {ControllerId}: Writing ItemId {ItemId} value false to position {Position}",
                        controller.Id, map.ItemId, absolutePosition);
                }
            }

            _logger.LogInformation(
                "WriteBoolean - Controller {ControllerId}: Writing {MappedCount} values to coils starting at protocol address {ProtocolAddress} (configured: {StartAddress})",
                controller.Id, mappedCount, protocolAddress, startingAddress);

            // Write 'count' coils starting at protocol address.
            await client.WriteMultipleCoilsAsync(unitIdentifier, protocolAddress,
                boolData); // packed coil bytes (8 coils per byte)

            _logger.LogInformation("WriteBoolean - Controller {ControllerId}: Write completed successfully",
                controller.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error writing Boolean values to controller {ControllerId} at {IPAddress}:{Port}",
                controller.Id, controller.IPAddress, controller.Port);
            throw; // Re-throw to be caught by the calling method's exception handling
        }
        finally
        {
            try
            {
                (client as IDisposable)?.Dispose();
            }
            catch
            {
                // Ignore disconnect errors to ensure cleanup continues
            }
        }
    }

    private async Task ReadInt(ControllerModbus controller)
    {
        ModbusClient? client = null;

        try
        {
            var maps = await Core.Controllers.GetModbusMaps(x => x.ControllerId == controller.Id &&
                                                                 x.OperationType == IoOperationType.Read);

            _logger.LogInformation("ReadInt - Controller {ControllerId}: Found {MapCount} read maps",
                controller.Id, maps.Count);

            if (maps.Count > 0)
            {
                foreach (var m in maps)
                {
                    _logger.LogInformation(
                        "ReadInt - Controller {ControllerId}: Map details - Position: {Position}, ItemId: {ItemId}",
                        controller.Id, m.Position, m.ItemId);
                }
            }

            if (maps.Count == 0)
            {
                _logger.LogInformation("ReadInt - Controller {ControllerId}: No read maps configured, skipping",
                    controller.Id);
                return;
            }

            // use specified IP address and port
            _logger.LogInformation("ReadInt - Controller {ControllerId}: Connecting to {IPAddress}:{Port} (ConnectionType: {ConnectionType}, ModbusType: {ModbusType})",
                controller.Id, controller.IPAddress, controller.Port, controller.ConnectionType, controller.ModbusType);

            client = CreateAndConnectClient(controller);

            _logger.LogInformation("ReadInt - Controller {ControllerId}: Connected successfully", controller.Id);

            var unitIdentifier = controller.UnitIdentifier ?? 1; // Use configured unit/slave ID (0-247), default to 1

            var startingAddress = controller.StartAddress;
            var count = controller.DataLength;
            
            // Convert configured address to protocol address
            var protocolAddress = ConvertToProtocolAddress(startingAddress, controller.AddressBase);

            _logger.LogInformation(
                "ReadInt - Controller {ControllerId}: Reading {Count} registers from protocol address {ProtocolAddress} (configured: {StartAddress}, AddressBase: {AddressBase})",
                controller.Id, count, protocolAddress, startingAddress, controller.AddressBase ?? ModbusAddressBase.Base0);

            // Read registers in chunks of max 125 (Modbus limit per read operation)
            const int maxRegistersPerRead = 125;
            var allRegisters = new List<short>();
            var remainingCount = count;
            var currentAddress = protocolAddress;
            
            while (remainingCount > 0)
            {
                var chunkSize = Math.Min(remainingCount, maxRegistersPerRead);
                _logger.LogDebug(
                    "ReadInt - Controller {ControllerId}: Reading chunk of {ChunkSize} registers from address {Address}",
                    controller.Id, chunkSize, currentAddress);
                    
                var chunkData = client.ReadHoldingRegisters<short>(unitIdentifier, currentAddress, chunkSize);
                allRegisters.AddRange(chunkData.ToArray());
                
                remainingCount -= chunkSize;
                currentAddress += chunkSize;
            }
            
            var intData = allRegisters.ToArray().AsSpan();

            _logger.LogInformation("ReadInt - Controller {ControllerId}: Read {DataLength} registers successfully (in {ChunkCount} chunk(s))",
                controller.Id, intData.Length, (int)Math.Ceiling((double)count / maxRegistersPerRead));

            var time = DateTimeOffset.UtcNow;
            DateTimeOffset timeOffset = time;
            var epoch = timeOffset.ToUnixTimeSeconds();

            var message = new ReadValuesMessage();
            var mappedCount = 0;

            _logger.LogInformation(
                "ReadInt - Controller {ControllerId}: Processing registers from {StartAddr} to {EndAddr}",
                controller.Id, controller.StartAddress, controller.StartAddress + intData.Length - 1);

            // Determine if maps use relative positioning (0-based offset from StartAddress) or absolute positioning
            var minAbsolutePosition = controller.StartAddress;
            var maxAbsolutePosition = controller.StartAddress + controller.DataLength - 1;
            var usesAbsolutePositioning = maps.Any(m => m.Position >= minAbsolutePosition && m.Position <= maxAbsolutePosition);
            
            _logger.LogInformation(
                "ReadInt - Controller {ControllerId}: Map positioning mode: {Mode} (absolute range: {Min}-{Max})",
                controller.Id, usesAbsolutePositioning ? "Absolute" : "Relative", minAbsolutePosition, maxAbsolutePosition);

            for (int i = 0; i < intData.Length; i++)
            {
                var absolutePosition = controller.StartAddress + i;
                var relativePosition = i;
                
                var map = usesAbsolutePositioning 
                    ? maps.FirstOrDefault(x => x.Position == absolutePosition)
                    : maps.FirstOrDefault(x => x.Position == relativePosition);
                    
                if (map == null)
                {
                    _logger.LogDebug("ReadInt - Controller {ControllerId}: No map found for position {Position} (absolute: {AbsPos}, relative: {RelPos})",
                        controller.Id, usesAbsolutePositioning ? absolutePosition : relativePosition, absolutePosition, relativePosition);
                    continue;
                }

                _logger.LogInformation(
                    "ReadInt - Controller {ControllerId}: Found map at position {Position} (map.Position={MapPosition}) for ItemId {ItemId}",
                    controller.Id, absolutePosition, map.Position, map.ItemId);

                var value = intData[i].ToString();

                message.Values.Add(new ReadValuesMessage.ReadValue()
                {
                    ItemId = map.ItemId,
                    Value = value,
                    Time = epoch,
                });

                mappedCount++;

                var output =
                    $"PointNumber: {map.ItemId}, Value: {value}, Time: {time.ToLocalTime().ToString()}";

                _logger.LogInformation(output);
            }

            _logger.LogInformation(
                "ReadInt - Controller {ControllerId}: Mapped {MappedCount} values, sending message to bus",
                controller.Id, mappedCount);

            if (message.Values.Count > 0)
            {
                await _bus.Send<ReadValuesMessage>(message);
                _logger.LogInformation(
                    "ReadInt - Controller {ControllerId}: Message sent successfully with {ValueCount} values",
                    controller.Id, message.Values.Count);
            }
            else
            {
                _logger.LogWarning("ReadInt - Controller {ControllerId}: No values to send - message is empty",
                    controller.Id);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading Int values from controller {ControllerId} at {IPAddress}:{Port}",
                controller.Id, controller.IPAddress, controller.Port);
            throw; // Re-throw to be caught by the calling method's exception handling
        }
        finally
        {
            try
            {
                (client as IDisposable)?.Dispose();
            }
            catch
            {
                // Ignore disconnect errors to ensure cleanup continues
            }
        }
    }

    /// <summary>
    /// Converts two 16-bit Modbus registers to a 32-bit float based on the specified endianness.
    /// FluentModbus already handles byte order within each 16-bit register based on ModbusEndianness.
    /// This function only handles WORD ORDER (which register comes first in the 32-bit value).
    /// </summary>
    /// <param name="reg1">First register (lower address)</param>
    /// <param name="reg2">Second register (higher address)</param>
    /// <param name="endianness">Word ordering mode for 32-bit values</param>
    /// <returns>The converted float value</returns>
    /// <remarks>
    /// After FluentModbus reads registers, each short is in host byte order.
    /// BitConverter.GetBytes on little-endian systems (Windows) returns [LowByte, HighByte].
    /// BitConverter.ToSingle expects bytes in little-endian order: [byte0, byte1, byte2, byte3]
    /// where byte0 is the least significant byte of the float.
    /// 
    /// Word Order options:
    /// - BigEndian/None: reg1 is high word, reg2 is low word (standard Modbus)
    /// - LittleEndian: reg1 is low word, reg2 is high word (word-swapped)
    /// - MidBigEndian: Same as LittleEndian (low word first) - for devices like Schneider PM2200
    /// - MidLittleEndian: Same as BigEndian (high word first)
    /// </remarks>
    private float ConvertRegistersToFloat(short reg1, short reg2, Endianness? endianness)
    {
        byte[] reg1Bytes = BitConverter.GetBytes(reg1); // [LowByte, HighByte] on Windows
        byte[] reg2Bytes = BitConverter.GetBytes(reg2); // [LowByte, HighByte] on Windows

        // Default to BigEndian (Modbus standard) when None or null
        var mode = endianness ?? Endianness.None;

        byte[] bytes;
        
        switch (mode)
        {
            case Endianness.None:
            case Endianness.BigEndian:
            case Endianness.MidLittleEndian:
                // High word first (reg1), then low word (reg2)
                // Result: reg1 bytes followed by reg2 bytes in host order
                bytes = new byte[] { reg2Bytes[0], reg2Bytes[1], reg1Bytes[0], reg1Bytes[1] };
                break;

            case Endianness.LittleEndian:
            case Endianness.MidBigEndian:
                // Low word first (reg1), then high word (reg2) - word swapped
                // This is what Schneider PM2200 and similar devices use
                bytes = new byte[] { reg1Bytes[0], reg1Bytes[1], reg2Bytes[0], reg2Bytes[1] };
                break;

            default:
                throw new ArgumentOutOfRangeException(nameof(endianness), endianness, "Unsupported endianness mode");
        }

        return BitConverter.ToSingle(bytes, 0);
    }

    /// <summary>
    /// Converts a 32-bit float to two 16-bit Modbus registers based on the specified endianness.
    /// FluentModbus handles byte order within each register, so this only handles WORD ORDER.
    /// </summary>
    /// <param name="value">The float value to convert</param>
    /// <param name="endianness">Word ordering mode for 32-bit values</param>
    /// <returns>Array of two shorts representing the registers [reg1, reg2]</returns>
    private short[] ConvertFloatToRegisters(float value, Endianness? endianness)
    {
        byte[] floatBytes = BitConverter.GetBytes(value); // [byte0, byte1, byte2, byte3] in little-endian
        short[] registers = new short[2];

        // Default to BigEndian (Modbus standard) when None or null
        var mode = endianness ?? Endianness.None;

        switch (mode)
        {
            case Endianness.None:
            case Endianness.BigEndian:
            case Endianness.MidLittleEndian:
                // High word first (reg1), then low word (reg2)
                // floatBytes[2,3] is high word, floatBytes[0,1] is low word
                registers[0] = BitConverter.ToInt16(floatBytes, 2); // High word
                registers[1] = BitConverter.ToInt16(floatBytes, 0); // Low word
                break;

            case Endianness.LittleEndian:
            case Endianness.MidBigEndian:
                // Low word first (reg1), then high word (reg2) - word swapped
                registers[0] = BitConverter.ToInt16(floatBytes, 0); // Low word
                registers[1] = BitConverter.ToInt16(floatBytes, 2); // High word
                break;

            default:
                throw new ArgumentOutOfRangeException(nameof(endianness), endianness, "Unsupported endianness mode");
        }

        return registers;
    }

    private async Task ReadFloat(ControllerModbus controller)
    {
        ModbusClient? client = null;

        try
        {
            var maps = await Core.Controllers.GetModbusMaps(x => x.ControllerId == controller.Id &&
                                                                 x.OperationType == IoOperationType.Read);

            _logger.LogInformation("ReadFloat - Controller {ControllerId}: Found {MapCount} read maps",
                controller.Id, maps.Count);

            if (maps.Count > 0)
            {
                foreach (var m in maps)
                {
                    _logger.LogInformation(
                        "ReadFloat - Controller {ControllerId}: Map details - Position: {Position}, ItemId: {ItemId}",
                        controller.Id, m.Position, m.ItemId);
                }
                
                // Log expected positions for float reading (every 2 registers)
                var expectedPositions = new List<int>();
                for (int pos = 0; pos < controller.DataLength - 1; pos += 2)
                {
                    expectedPositions.Add(controller.StartAddress + pos);
                }
                _logger.LogInformation(
                    "ReadFloat - Controller {ControllerId}: Expected map positions for floats (every 2 registers): {ExpectedPositions}",
                    controller.Id, string.Join(", ", expectedPositions.Take(10)) + (expectedPositions.Count > 10 ? "..." : ""));
                
                // Check which maps match expected positions
                var matchingMaps = maps.Where(m => expectedPositions.Contains(m.Position)).ToList();
                var nonMatchingMaps = maps.Where(m => !expectedPositions.Contains(m.Position)).ToList();
                
                _logger.LogInformation(
                    "ReadFloat - Controller {ControllerId}: Maps matching expected positions: {MatchCount}, Maps NOT matching: {NonMatchCount}",
                    controller.Id, matchingMaps.Count, nonMatchingMaps.Count);
                
                if (nonMatchingMaps.Count > 0)
                {
                    _logger.LogWarning(
                        "ReadFloat - Controller {ControllerId}: Non-matching map positions (these won't be read): {Positions}",
                        controller.Id, string.Join(", ", nonMatchingMaps.Select(m => m.Position)));
                }
            }

            if (maps.Count == 0)
            {
                _logger.LogInformation("ReadFloat - Controller {ControllerId}: No read maps configured, skipping",
                    controller.Id);
                return;
            }

            // use specified IP address and port
            _logger.LogInformation("ReadFloat - Controller {ControllerId}: Connecting to {IPAddress}:{Port} (ConnectionType: {ConnectionType}, ModbusType: {ModbusType})",
                controller.Id, controller.IPAddress, controller.Port, controller.ConnectionType, controller.ModbusType);

            client = CreateAndConnectClient(controller);

            _logger.LogInformation("ReadFloat - Controller {ControllerId}: Connected successfully", controller.Id);

            var unitIdentifier = controller.UnitIdentifier ?? 1; // Use configured unit/slave ID (0-247), default to 1

            var startingAddress = controller.StartAddress;
            var count = controller.DataLength; // Number of registers (2 registers per float)
            
            // Convert configured address to protocol address based on AddressBase setting
            var protocolAddress = ConvertToProtocolAddress(startingAddress, controller.AddressBase);
            _logger.LogInformation(
                "ReadFloat - Controller {ControllerId}: Address conversion - Configured: {ConfiguredAddress}, Protocol: {ProtocolAddress}, AddressBase: {AddressBase}",
                controller.Id, startingAddress, protocolAddress, controller.AddressBase ?? ModbusAddressBase.Base0);

            _logger.LogInformation(
                "ReadFloat - Controller {ControllerId}: Reading {Count} registers from protocol address {ProtocolAddress}",
                controller.Id, count, protocolAddress);

            // Read registers in chunks of max 125 (Modbus limit per read operation)
            const int maxRegistersPerRead = 125;
            var allRegisters = new List<short>();
            var remainingCount = count;
            var currentAddress = protocolAddress;
            
            while (remainingCount > 0)
            {
                var chunkSize = Math.Min(remainingCount, maxRegistersPerRead);
                _logger.LogDebug(
                    "ReadFloat - Controller {ControllerId}: Reading chunk of {ChunkSize} registers from address {Address}",
                    controller.Id, chunkSize, currentAddress);
                    
                var chunkData = client.ReadHoldingRegisters<short>(unitIdentifier, currentAddress, chunkSize);
                allRegisters.AddRange(chunkData.ToArray());
                
                remainingCount -= chunkSize;
                currentAddress += chunkSize;
            }
            
            var regData = allRegisters.ToArray().AsSpan();

            _logger.LogInformation("ReadFloat - Controller {ControllerId}: Read {DataLength} registers successfully (in {ChunkCount} chunk(s))",
                controller.Id, regData.Length, (int)Math.Ceiling((double)count / maxRegistersPerRead));
            
            // Log first few register values for debugging
            var sampleRegisters = regData.ToArray().Take(20).ToArray();
            _logger.LogInformation(
                "ReadFloat - Controller {ControllerId}: First {SampleCount} register values (raw): {Values}",
                controller.Id, sampleRegisters.Length, string.Join(", ", sampleRegisters));
            
            // Log first few float conversions for debugging
            for (int dbgIdx = 0; dbgIdx < Math.Min(10, regData.Length - 1); dbgIdx += 2)
            {
                var dbgFloat = ConvertRegistersToFloat(regData[dbgIdx], regData[dbgIdx + 1], controller.Endianness);
                _logger.LogInformation(
                    "ReadFloat - Controller {ControllerId}: Registers [{Reg1}, {Reg2}] at position {Position} -> Float: {FloatValue} (Endianness: {Endianness})",
                    controller.Id, regData[dbgIdx], regData[dbgIdx + 1], controller.StartAddress + dbgIdx, dbgFloat, controller.Endianness);
            }

            var time = DateTimeOffset.UtcNow;
            DateTimeOffset timeOffset = time;
            var epoch = timeOffset.ToUnixTimeSeconds();

            var message = new ReadValuesMessage();
            var mappedCount = 0;

            _logger.LogInformation(
                "ReadFloat - Controller {ControllerId}: Processing registers from {StartAddr} to {EndAddr} (floats use 2 registers each)",
                controller.Id, controller.StartAddress, controller.StartAddress + regData.Length - 1);

            // Determine if maps use relative positioning (0-based offset from StartAddress) or absolute positioning
            // Check if any map position falls within the absolute address range
            var minAbsolutePosition = controller.StartAddress;
            var maxAbsolutePosition = controller.StartAddress + controller.DataLength - 1;
            var usesAbsolutePositioning = maps.Any(m => m.Position >= minAbsolutePosition && m.Position <= maxAbsolutePosition);
            
            _logger.LogInformation(
                "ReadFloat - Controller {ControllerId}: Map positioning mode: {Mode} (absolute range: {Min}-{Max})",
                controller.Id, usesAbsolutePositioning ? "Absolute" : "Relative", minAbsolutePosition, maxAbsolutePosition);
            
            // Log the actual map positions for debugging
            var mapPositions = maps.Select(m => m.Position).OrderBy(p => p).ToList();
            _logger.LogInformation(
                "ReadFloat - Controller {ControllerId}: Actual map positions in database: {Positions}",
                controller.Id, string.Join(", ", mapPositions.Take(20)) + (mapPositions.Count > 20 ? $"... ({mapPositions.Count} total)" : ""));

            // Process each map and find its corresponding register pair
            // Maps can be at any position, not just even offsets
            foreach (var map in maps)
            {
                // Calculate the register index based on map position
                int registerIndex;
                if (usesAbsolutePositioning)
                {
                    // Map position is absolute (e.g., 43027)
                    registerIndex = map.Position - controller.StartAddress;
                }
                else
                {
                    // Map position is relative (e.g., 27)
                    registerIndex = map.Position;
                }
                
                // Validate register index is within bounds (need 2 registers for a float)
                if (registerIndex < 0 || registerIndex >= regData.Length - 1)
                {
                    _logger.LogWarning(
                        "ReadFloat - Controller {ControllerId}: Map position {MapPosition} translates to register index {RegIndex} which is out of bounds (valid: 0-{MaxIndex})",
                        controller.Id, map.Position, registerIndex, regData.Length - 2);
                    continue;
                }

                _logger.LogInformation(
                    "ReadFloat - Controller {ControllerId}: Found map at position {MapPosition} -> register index {RegIndex} for ItemId {ItemId}",
                    controller.Id, map.Position, registerIndex, map.ItemId);

                // Convert two registers to float using the controller's endianness setting
                var floatValue = ConvertRegistersToFloat(regData[registerIndex], regData[registerIndex + 1], controller.Endianness);
                var value = floatValue.ToString("G");

                message.Values.Add(new ReadValuesMessage.ReadValue()
                {
                    ItemId = map.ItemId,
                    Value = value,
                    Time = epoch,
                });

                mappedCount++;

                var output =
                    $"PointNumber: {map.ItemId}, Value: {value}, Time: {time.ToLocalTime().ToString()}";

                _logger.LogInformation(output);
            }

            _logger.LogInformation(
                "ReadFloat - Controller {ControllerId}: Mapped {MappedCount} values, sending message to bus",
                controller.Id, mappedCount);

            if (message.Values.Count > 0)
            {
                await _bus.Send<ReadValuesMessage>(message);
                _logger.LogInformation(
                    "ReadFloat - Controller {ControllerId}: Message sent successfully with {ValueCount} values",
                    controller.Id, message.Values.Count);
            }
            else
            {
                _logger.LogWarning("ReadFloat - Controller {ControllerId}: No values to send - message is empty",
                    controller.Id);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading Float values from controller {ControllerId} at {IPAddress}:{Port}",
                controller.Id, controller.IPAddress, controller.Port);
            throw; // Re-throw to be caught by the calling method's exception handling
        }
        finally
        {
            try
            {
                (client as IDisposable)?.Dispose();
            }
            catch
            {
                // Ignore disconnect errors to ensure cleanup continues
            }
        }
    }

    private async Task WriteFloat(ControllerModbus controller)
    {
        ModbusClient? client = null;

        try
        {
            var maps = await Core.Controllers.GetModbusMaps(x => x.ControllerId == controller.Id &&
                                                                 x.OperationType == IoOperationType.Write);

            _logger.LogInformation("WriteFloat - Controller {ControllerId}: Found {MapCount} write maps",
                controller.Id, maps.Count);

            if (maps.Count == 0)
            {
                _logger.LogInformation("WriteFloat - Controller {ControllerId}: No write maps configured, skipping",
                    controller.Id);
                return; // No maps to write, exit early
            }

            var values = await Core.Points.GetWriteItems();
            _logger.LogInformation(
                "WriteFloat - Controller {ControllerId}: Retrieved {ValueCount} write items from database",
                controller.Id, values.Count);

            // use specified IP address and port
            _logger.LogInformation("WriteFloat - Controller {ControllerId}: Connecting to {IPAddress}:{Port} (ConnectionType: {ConnectionType}, ModbusType: {ModbusType})",
                controller.Id, controller.IPAddress, controller.Port, controller.ConnectionType, controller.ModbusType);

            client = CreateAndConnectClient(controller);

            _logger.LogInformation("WriteFloat - Controller {ControllerId}: Connected successfully", controller.Id);

            var unitIdentifier = controller.UnitIdentifier ?? 1; // Use configured unit/slave ID (0-247), default to 1

            var startingAddress = controller.StartAddress;
            var count = controller.DataLength; // Number of registers (2 registers per float)
            
            // Convert configured address to protocol address
            var protocolAddress = ConvertToProtocolAddress(startingAddress, controller.AddressBase);

            var regData = new short[count];
            var mappedCount = 0;

            // Determine if maps use relative positioning (0-based offset from StartAddress) or absolute positioning
            var minAbsolutePosition = controller.StartAddress;
            var maxAbsolutePosition = controller.StartAddress + controller.DataLength - 1;
            var usesAbsolutePositioning = maps.Any(m => m.Position >= minAbsolutePosition && m.Position <= maxAbsolutePosition);

            // Process each map and find its corresponding register pair
            foreach (var map in maps)
            {
                // Calculate the register index based on map position
                int registerIndex;
                if (usesAbsolutePositioning)
                {
                    registerIndex = map.Position - controller.StartAddress;
                }
                else
                {
                    registerIndex = map.Position;
                }
                
                // Validate register index is within bounds (need 2 registers for a float)
                if (registerIndex < 0 || registerIndex >= count - 1)
                {
                    _logger.LogWarning(
                        "WriteFloat - Controller {ControllerId}: Map position {MapPosition} translates to register index {RegIndex} which is out of bounds (valid: 0-{MaxIndex})",
                        controller.Id, map.Position, registerIndex, count - 2);
                    continue;
                }

                var item = _items?.FirstOrDefault(x => x.Id == map.ItemId);
                if (item == null)
                {
                    _logger.LogWarning(
                        "WriteFloat - Controller {ControllerId}: Item not found for map ItemId {ItemId} at position {Position}",
                        controller.Id, map.ItemId, map.Position);
                    continue;
                }

                var matched = values.FirstOrDefault(x => x.ItemId == map.ItemId);
                string? value = "0";

                if (matched != null)
                {
                    // Skip this write item if it has expired: compare current epoch seconds to the item's timestamp + duration.
                    // Duration of 0 means infinite write (never expires).
                    DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
                    long epochTime = currentTimeUtc.ToUnixTimeSeconds();

                    if (matched.DurationSeconds > 0 && epochTime - matched.Time > matched.DurationSeconds)
                    {
                        continue;
                    }

                    var denormalized = GetDenormalizedValue(item, matched);
                    value = denormalized.Value;
                }

                if (float.TryParse(value, out float floatValue))
                {
                    // Convert float to two registers using the controller's endianness setting
                    var registers = ConvertFloatToRegisters(floatValue, controller.Endianness);
                    regData[registerIndex] = registers[0];
                    regData[registerIndex + 1] = registers[1];
                    mappedCount++;
                    _logger.LogDebug(
                        "WriteFloat - Controller {ControllerId}: Writing ItemId {ItemId} value {Value} (parsed from '{OriginalValue}') to register index {RegIndex} (map position {MapPosition})",
                        controller.Id, map.ItemId, floatValue, value, registerIndex, map.Position);
                }
                else
                {
                    // Write 0.0f as two registers
                    var registers = ConvertFloatToRegisters(0.0f, controller.Endianness);
                    regData[registerIndex] = registers[0];
                    regData[registerIndex + 1] = registers[1];
                    _logger.LogWarning(
                        "WriteFloat - Controller {ControllerId}: Invalid value '{Value}' for ItemId {ItemId}, writing 0.0",
                        controller.Id, value, map.ItemId);
                }
            }

            _logger.LogInformation(
                "WriteFloat - Controller {ControllerId}: Writing {MappedCount} float values ({RegisterCount} registers) starting at protocol address {ProtocolAddress} (configured: {StartAddress})",
                controller.Id, mappedCount, count, protocolAddress, startingAddress);

            // Write 'count' holding registers starting at protocol address.
            await client.WriteMultipleRegistersAsync(unitIdentifier, protocolAddress,
                regData); // array of 16-bit register values

            _logger.LogInformation("WriteFloat - Controller {ControllerId}: Write completed successfully", controller.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error writing Float values to controller {ControllerId} at {IPAddress}:{Port}",
                controller.Id, controller.IPAddress, controller.Port);
            throw; // Re-throw to be caught by the calling method's exception handling
        }
        finally
        {
            try
            {
                (client as IDisposable)?.Dispose();
            }
            catch
            {
                // Ignore disconnect errors to ensure cleanup continues
            }
        }
    }

    private async Task ReadBoolean(ControllerModbus controller)
    {
        ModbusClient? client = null;

        try
        {
            var maps = await Core.Controllers.GetModbusMaps(x => x.ControllerId == controller.Id &&
                                                                 x.OperationType == IoOperationType.Read);

            _logger.LogInformation("ReadBoolean - Controller {ControllerId}: Found {MapCount} read maps",
                controller.Id, maps.Count);

            if (maps.Count == 0)
            {
                _logger.LogInformation("ReadBoolean - Controller {ControllerId}: No read maps configured, skipping",
                    controller.Id);
                return;
            }

            // use specified IP address and port
            _logger.LogInformation("ReadBoolean - Controller {ControllerId}: Connecting to {IPAddress}:{Port} (ConnectionType: {ConnectionType}, ModbusType: {ModbusType})",
                controller.Id, controller.IPAddress, controller.Port, controller.ConnectionType, controller.ModbusType);

            client = CreateAndConnectClient(controller);

            _logger.LogInformation("ReadBoolean - Controller {ControllerId}: Connected successfully", controller.Id);

            var unitIdentifier = controller.UnitIdentifier ?? 1; // Use configured unit/slave ID (0-247), default to 1

            var startingAddress = controller.StartAddress;
            var count = controller.DataLength;
            
            // Convert configured address to protocol address
            var protocolAddress = ConvertToProtocolAddress(startingAddress, controller.AddressBase);

            _logger.LogInformation(
                "ReadBoolean - Controller {ControllerId}: Reading {Count} coils from protocol address {ProtocolAddress} (configured: {StartAddress}, AddressBase: {AddressBase})",
                controller.Id, count, protocolAddress, startingAddress, controller.AddressBase ?? ModbusAddressBase.Base0);

            // Read 'count' coils starting at protocol address.
            var boolData =
                client.ReadCoils(unitIdentifier, protocolAddress, count); // packed coil bytes (8 coils per byte)

            _logger.LogInformation("ReadBoolean - Controller {ControllerId}: Read {DataLength} bytes successfully",
                controller.Id, boolData.Length);

            var bitIndex = 1; // overall 1-based bit index across all returned bytes

            var time = DateTimeOffset.UtcNow;
            DateTimeOffset timeOffset = time;
            var epoch = timeOffset.ToUnixTimeSeconds();

            var message = new ReadValuesMessage();
            var mappedCount = 0;

            // Determine if maps use relative positioning (0-based offset from StartAddress) or absolute positioning
            var minAbsolutePosition = controller.StartAddress;
            var maxAbsolutePosition = controller.StartAddress + controller.DataLength - 1;
            var usesAbsolutePositioning = maps.Any(m => m.Position >= minAbsolutePosition && m.Position <= maxAbsolutePosition);
            
            _logger.LogInformation(
                "ReadBoolean - Controller {ControllerId}: Map positioning mode: {Mode} (absolute range: {Min}-{Max})",
                controller.Id, usesAbsolutePositioning ? "Absolute" : "Relative", minAbsolutePosition, maxAbsolutePosition);

            for (int i = 0; i < boolData.Length; i++)
            {
                // each element in boolData is a byte containing up to 8 coil values (LSB = coil 0)
                for (int j = 0; j < 8; j++)
                {
                    var currentIndex = i * 8 + j + 1; // convert byte index and bit to 1-based coil index
                    var absolutePosition = controller.StartAddress + currentIndex - 1;
                    var relativePosition = currentIndex - 1;
                    
                    var map = usesAbsolutePositioning 
                        ? maps.FirstOrDefault(x => x.Position == absolutePosition)
                        : maps.FirstOrDefault(x => x.Position == relativePosition);
                        
                    if (map == null)
                    {
                        _logger.LogDebug(
                            "ReadBoolean - Controller {ControllerId}: No map found for position {Position} (absolute: {AbsPos}, relative: {RelPos})",
                            controller.Id, usesAbsolutePositioning ? absolutePosition : relativePosition, absolutePosition, relativePosition);
                        continue;
                    }

                    // stop when we've processed the number of coils actually requested (count2)
                    if (currentIndex > count) break;

                    // extract the j-th bit from the i-th byte
                    var boolValue = ((boolData[i] >> j) & 1) > 0;
                    var value = "0";

                    if (boolValue)
                    {
                        value = "1";
                    }

                    message.Values.Add(new ReadValuesMessage.ReadValue()
                    {
                        ItemId = map.ItemId,
                        Value = value,
                        Time = epoch,
                    });

                    mappedCount++;

                    bitIndex++; // advance overall bit counter

                    var output =
                        $"PointNumber: {map.ItemId}, Value: {value}, Time: {time.ToLocalTime().ToString()}";

                    _logger.LogInformation(output);
                }
            }

            _logger.LogInformation(
                "ReadBoolean - Controller {ControllerId}: Mapped {MappedCount} values, sending message to bus",
                controller.Id, mappedCount);

            if (message.Values.Count > 0)
            {
                await _bus.Send<ReadValuesMessage>(message);
                _logger.LogInformation(
                    "ReadBoolean - Controller {ControllerId}: Message sent successfully with {ValueCount} values",
                    controller.Id, message.Values.Count);
            }
            else
            {
                _logger.LogWarning("ReadBoolean - Controller {ControllerId}: No values to send - message is empty",
                    controller.Id);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading Boolean values from controller {ControllerId} at {IPAddress}:{Port}",
                controller.Id, controller.IPAddress, controller.Port);
            throw; // Re-throw to be caught by the calling method's exception handling
        }
        finally
        {
            try
            {
                (client as IDisposable)?.Dispose();
            }
            catch
            {
                // Ignore disconnect errors to ensure cleanup continues
            }
        }
    }
}