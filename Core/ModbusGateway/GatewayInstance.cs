using System.Collections.Concurrent;
using System.Net;
using Core;
using Core.Libs;
using Core.Models;
using FluentModbus;
using Microsoft.Extensions.Logging;

namespace ModbusGateway;

/// <summary>
/// Represents a single Modbus TCP server instance for a gateway configuration.
/// Manages the server lifecycle, register updates, and connection tracking.
/// </summary>
public class GatewayInstance : IDisposable
{
    private readonly ModbusGatewayConfig _config;
    private readonly ILogger _logger;
    private ModbusTcpServer? _server;
    private List<ModbusGatewayMapping> _mappings;
    private Dictionary<Guid, MonitoringItem> _itemsCache;
    private readonly object _lock = new();
    private bool _isRunning;
    private int _connectedClients;
    private DateTime? _lastReadTime;
    private DateTime? _lastWriteTime;

    public Guid GatewayId => _config.Id;
    public string Name => _config.Name;
    public bool IsRunning => _isRunning;
    public int ConnectedClients => _connectedClients;
    public DateTime? LastReadTime => _lastReadTime;
    public DateTime? LastWriteTime => _lastWriteTime;

    public GatewayInstance(ModbusGatewayConfig config, ILogger logger)
    {
        _config = config;
        _logger = logger;
        _mappings = config.Mappings?.ToList() ?? new List<ModbusGatewayMapping>();
        _itemsCache = new Dictionary<Guid, MonitoringItem>();
    }

    /// <summary>
    /// Starts the Modbus TCP server.
    /// </summary>
    public void Start()
    {
        if (_isRunning)
        {
            _logger.LogWarning("Gateway {Name} is already running", _config.Name);
            return;
        }

        try
        {
            _server = new ModbusTcpServer(_logger)
            {
                EnableRaisingEvents = true
            };

            // Subscribe to register change events for write handling
            _server.RegistersChanged += OnRegistersChanged;
            _server.CoilsChanged += OnCoilsChanged;

            var endpoint = new IPEndPoint(IPAddress.Parse(_config.ListenIP), _config.Port);
            _server.Start(endpoint);

            _isRunning = true;
            _logger.LogInformation("Gateway {Name} started on {IP}:{Port} (Unit ID: {UnitId})",
                _config.Name, _config.ListenIP, _config.Port, _config.UnitId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start gateway {Name} on port {Port}", _config.Name, _config.Port);
            throw;
        }
    }

    /// <summary>
    /// Stops the Modbus TCP server.
    /// </summary>
    public void Stop()
    {
        if (!_isRunning || _server == null)
        {
            return;
        }

        try
        {
            // Unsubscribe from events (safe even if not subscribed)
            _server.RegistersChanged -= OnRegistersChanged;
            _server.CoilsChanged -= OnCoilsChanged;

            _server.Dispose();
            _server = null;
            _isRunning = false;
            _connectedClients = 0;

            _logger.LogInformation("Gateway {Name} stopped", _config.Name);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error stopping gateway {Name}", _config.Name);
        }
    }

    /// <summary>
    /// Updates the gateway mappings (called when configuration changes).
    /// </summary>
    public void UpdateMappings(List<ModbusGatewayMapping> mappings)
    {
        lock (_lock)
        {
            _mappings = mappings;
        }
    }

    /// <summary>
    /// Updates the items cache for mapping lookups.
    /// </summary>
    public void UpdateItemsCache(Dictionary<Guid, MonitoringItem> itemsCache)
    {
        lock (_lock)
        {
            _itemsCache = itemsCache;
        }
    }

    /// <summary>
    /// Updates all register values from monitoring data.
    /// This should be called periodically to sync data with the Modbus server.
    /// </summary>
    public async Task UpdateRegistersAsync()
    {
        if (_server == null || !_isRunning)
            return;

        try
        {
            // Get all raw values and write items
            var rawItems = await Points.GetRawItems();
            var writeItems = await Points.GetWriteItems();

            // Build lookup dictionaries
            var rawLookup = rawItems.ToDictionary(r => r.ItemId, r => r.Value);
            var writeLookup = writeItems.ToDictionary(w => w.ItemId, w => w.Value);

            lock (_server.Lock)
            {
                List<ModbusGatewayMapping> mappingsCopy;
                lock (_lock)
                {
                    mappingsCopy = _mappings.ToList();
                }

                foreach (var mapping in mappingsCopy)
                {
                    // Priority: WriteItem > RawItem
                    string? valueStr = null;
                    if (writeLookup.TryGetValue(mapping.ItemId, out var writeValue))
                    {
                        valueStr = writeValue;
                    }
                    else if (rawLookup.TryGetValue(mapping.ItemId, out var rawValue))
                    {
                        valueStr = rawValue;
                    }

                    if (valueStr == null)
                        continue;

                    float value = DataConversionHelper.ParseStringValue(valueStr);

                    try
                    {
                        WriteValueToServer(mapping, value);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to write value for mapping {MappingId} at address {Address}",
                            mapping.Id, mapping.ModbusAddress);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating registers for gateway {Name}", _config.Name);
        }
    }

    /// <summary>
    /// Writes a value to the appropriate Modbus register/coil.
    /// </summary>
    private void WriteValueToServer(ModbusGatewayMapping mapping, float value)
    {
        if (_server == null)
            return;

        switch (mapping.RegisterType)
        {
            case ModbusRegisterType.Coil:
                var coils = _server.GetCoils();
                coils.Set(mapping.ModbusAddress, DataConversionHelper.ValueToCoil(value));
                break;

            case ModbusRegisterType.DiscreteInput:
                var discreteInputs = _server.GetDiscreteInputs();
                discreteInputs.Set(mapping.ModbusAddress, DataConversionHelper.ValueToCoil(value));
                break;

            case ModbusRegisterType.HoldingRegister:
                WriteToHoldingRegister(mapping, value);
                break;

            case ModbusRegisterType.InputRegister:
                WriteToInputRegister(mapping, value);
                break;
        }
    }

    /// <summary>
    /// Writes a value to holding registers with proper data representation.
    /// </summary>
    private void WriteToHoldingRegister(ModbusGatewayMapping mapping, float value)
    {
        if (_server == null)
            return;

        var registers = _server.GetHoldingRegisters();
        WriteValueToRegisters(registers, mapping, value);
    }

    /// <summary>
    /// Writes a value to input registers with proper data representation.
    /// </summary>
    private void WriteToInputRegister(ModbusGatewayMapping mapping, float value)
    {
        if (_server == null)
            return;

        var registers = _server.GetInputRegisters();
        WriteValueToRegisters(registers, mapping, value);
    }

    /// <summary>
    /// Writes a value to registers based on data representation.
    /// </summary>
    private void WriteValueToRegisters(Span<short> registers, ModbusGatewayMapping mapping, float value)
    {
        int address = mapping.ModbusAddress;

        switch (mapping.DataRepresentation)
        {
            case ModbusDataRepresentation.Int16:
                var int16Value = DataConversionHelper.ValueToInt16Register(value);
                if (address < registers.Length)
                {
                    registers[address] = (short)int16Value;
                }
                break;

            case ModbusDataRepresentation.Float32:
                var float32Values = DataConversionHelper.FloatToRegisters(value, mapping.Endianness);
                if (address + 1 < registers.Length)
                {
                    registers[address] = (short)float32Values[0];
                    registers[address + 1] = (short)float32Values[1];
                }
                break;

            case ModbusDataRepresentation.ScaledInteger:
                var scaleMin = mapping.ScaleMin ?? 0;
                var scaleMax = mapping.ScaleMax ?? 100;
                var scaledValue = DataConversionHelper.ValueToScaledRegister(value, scaleMin, scaleMax);
                if (address < registers.Length)
                {
                    registers[address] = (short)scaledValue;
                }
                break;
        }
    }

    /// <summary>
    /// Checks if an item is editable based on the items cache.
    /// </summary>
    private bool IsItemEditable(Guid itemId)
    {
        Dictionary<Guid, MonitoringItem> itemsCacheCopy;
        lock (_lock)
        {
            itemsCacheCopy = new Dictionary<Guid, MonitoringItem>(_itemsCache);
        }

        if (itemsCacheCopy.TryGetValue(itemId, out var item))
        {
            return item.IsEditable;
        }

        // If item not found in cache, deny by default
        return false;
    }

    /// <summary>
    /// Maps function code to register type.
    /// </summary>
    private static ModbusRegisterType GetRegisterTypeFromFunctionCode(ModbusFunctionCode functionCode)
    {
        return functionCode switch
        {
            ModbusFunctionCode.ReadCoils => ModbusRegisterType.Coil,
            ModbusFunctionCode.WriteSingleCoil => ModbusRegisterType.Coil,
            ModbusFunctionCode.WriteMultipleCoils => ModbusRegisterType.Coil,
            ModbusFunctionCode.ReadDiscreteInputs => ModbusRegisterType.DiscreteInput,
            ModbusFunctionCode.ReadHoldingRegisters => ModbusRegisterType.HoldingRegister,
            ModbusFunctionCode.WriteSingleRegister => ModbusRegisterType.HoldingRegister,
            ModbusFunctionCode.WriteMultipleRegisters => ModbusRegisterType.HoldingRegister,
            ModbusFunctionCode.ReadWriteMultipleRegisters => ModbusRegisterType.HoldingRegister,
            ModbusFunctionCode.ReadInputRegisters => ModbusRegisterType.InputRegister,
            _ => ModbusRegisterType.HoldingRegister
        };
    }

    /// <summary>
    /// Checks if two ranges overlap.
    /// </summary>
    private static bool RangesOverlap((int Start, int End) range1, (int Start, int End) range2)
    {
        return range1.Start <= range2.End && range2.Start <= range1.End;
    }

    /// <summary>
    /// Handles register write events from Modbus clients.
    /// </summary>
    private void OnRegistersChanged(object? sender, RegistersChangedEventArgs args)
    {
        _lastReadTime = DateTime.UtcNow;
        _lastWriteTime = DateTime.UtcNow;
        
        _ = Task.Run(async () =>
        {
            try
            {
                await ProcessRegisterWritesAsync(args.Registers, ModbusRegisterType.HoldingRegister);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing register writes for gateway {Name}", _config.Name);
            }
        });
    }

    /// <summary>
    /// Handles coil write events from Modbus clients.
    /// </summary>
    private void OnCoilsChanged(object? sender, CoilsChangedEventArgs args)
    {
        _lastReadTime = DateTime.UtcNow;
        _lastWriteTime = DateTime.UtcNow;
        
        _ = Task.Run(async () =>
        {
            try
            {
                await ProcessCoilWritesAsync(args.Coils);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing coil writes for gateway {Name}", _config.Name);
            }
        });
    }

    /// <summary>
    /// Processes register write events and writes values to controllers.
    /// </summary>
    private async Task ProcessRegisterWritesAsync(int[] addresses, ModbusRegisterType registerType)
    {
        if (_server == null)
            return;

        List<ModbusGatewayMapping> mappingsCopy;
        Dictionary<Guid, MonitoringItem> itemsCacheCopy;

        lock (_lock)
        {
            mappingsCopy = _mappings.ToList();
            itemsCacheCopy = new Dictionary<Guid, MonitoringItem>(_itemsCache);
        }

        // Find mappings that match the changed addresses
        foreach (var address in addresses.Distinct())
        {
            var mapping = mappingsCopy.FirstOrDefault(m =>
                m.RegisterType == registerType &&
                address >= m.ModbusAddress &&
                address < m.ModbusAddress + m.RegisterCount);

            if (mapping == null)
                continue;

            // Check if item is editable
            if (!itemsCacheCopy.TryGetValue(mapping.ItemId, out var item) || !item.IsEditable)
            {
                _logger.LogWarning("Write rejected for address {Address}: Item not editable", address);
                continue;
            }

            try
            {
                float value;
                lock (_server.Lock)
                {
                    value = ReadValueFromServer(mapping);
                }

                var valueStr = DataConversionHelper.FormatValueAsString(value);
                await Points.WriteValueToController(mapping.ItemId, valueStr);

                _logger.LogInformation("Wrote value {Value} to item {ItemId} from address {Address}",
                    value, mapping.ItemId, address);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to write value for address {Address}", address);
            }
        }
    }

    /// <summary>
    /// Processes coil write events.
    /// </summary>
    private async Task ProcessCoilWritesAsync(int[] addresses)
    {
        if (_server == null)
            return;

        List<ModbusGatewayMapping> mappingsCopy;
        Dictionary<Guid, MonitoringItem> itemsCacheCopy;

        lock (_lock)
        {
            mappingsCopy = _mappings.ToList();
            itemsCacheCopy = new Dictionary<Guid, MonitoringItem>(_itemsCache);
        }

        foreach (var address in addresses.Distinct())
        {
            var mapping = mappingsCopy.FirstOrDefault(m =>
                m.RegisterType == ModbusRegisterType.Coil &&
                m.ModbusAddress == address);

            if (mapping == null)
                continue;

            // Check if item is editable
            if (!itemsCacheCopy.TryGetValue(mapping.ItemId, out var item) || !item.IsEditable)
            {
                _logger.LogWarning("Coil write rejected for address {Address}: Item not editable", address);
                continue;
            }

            try
            {
                bool coilValue;
                lock (_server.Lock)
                {
                    var coils = _server.GetCoils();
                    coilValue = coils.Get(address);
                }

                var valueStr = DataConversionHelper.CoilToStringValue(coilValue);
                await Points.WriteValueToController(mapping.ItemId, valueStr);

                _logger.LogInformation("Wrote coil value {Value} to item {ItemId} from address {Address}",
                    coilValue, mapping.ItemId, address);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to write coil value for address {Address}", address);
            }
        }
    }

    /// <summary>
    /// Reads a value from the Modbus server registers based on mapping.
    /// </summary>
    private float ReadValueFromServer(ModbusGatewayMapping mapping)
    {
        if (_server == null)
            return 0;

        switch (mapping.RegisterType)
        {
            case ModbusRegisterType.HoldingRegister:
                return ReadFromHoldingRegister(mapping);

            case ModbusRegisterType.InputRegister:
                return ReadFromInputRegister(mapping);

            case ModbusRegisterType.Coil:
                var coils = _server.GetCoils();
                return coils.Get(mapping.ModbusAddress) ? 1 : 0;

            case ModbusRegisterType.DiscreteInput:
                var discreteInputs = _server.GetDiscreteInputs();
                return discreteInputs.Get(mapping.ModbusAddress) ? 1 : 0;

            default:
                return 0;
        }
    }

    /// <summary>
    /// Reads a value from holding registers.
    /// </summary>
    private float ReadFromHoldingRegister(ModbusGatewayMapping mapping)
    {
        if (_server == null)
            return 0;

        var registers = _server.GetHoldingRegisters();
        return ReadValueFromRegisters(registers, mapping);
    }

    /// <summary>
    /// Reads a value from input registers.
    /// </summary>
    private float ReadFromInputRegister(ModbusGatewayMapping mapping)
    {
        if (_server == null)
            return 0;

        var registers = _server.GetInputRegisters();
        return ReadValueFromRegisters(registers, mapping);
    }

    /// <summary>
    /// Reads a value from registers based on data representation.
    /// </summary>
    private float ReadValueFromRegisters(Span<short> registers, ModbusGatewayMapping mapping)
    {
        int address = mapping.ModbusAddress;

        switch (mapping.DataRepresentation)
        {
            case ModbusDataRepresentation.Int16:
                if (address < registers.Length)
                {
                    return DataConversionHelper.Int16RegisterToValue((ushort)registers[address]);
                }
                break;

            case ModbusDataRepresentation.Float32:
                if (address + 1 < registers.Length)
                {
                    var registerValues = new ushort[]
                    {
                        (ushort)registers[address],
                        (ushort)registers[address + 1]
                    };
                    return DataConversionHelper.RegistersToFloat(registerValues, mapping.Endianness);
                }
                break;

            case ModbusDataRepresentation.ScaledInteger:
                if (address < registers.Length)
                {
                    var scaleMin = mapping.ScaleMin ?? 0;
                    var scaleMax = mapping.ScaleMax ?? 100;
                    return DataConversionHelper.ScaledRegisterToValue((ushort)registers[address], scaleMin, scaleMax);
                }
                break;
        }

        return 0;
    }

    public void Dispose()
    {
        Stop();
    }
}
