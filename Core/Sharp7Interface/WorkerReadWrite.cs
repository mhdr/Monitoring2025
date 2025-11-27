using System.Globalization;
using Contracts;
using Core.Libs;
using Core.Models;
using MassTransit;
using Sharp7;

namespace Sharp7Interface;

public class WorkerReadWrite : BackgroundService
{
    private readonly ILogger<WorkerReadWrite> _logger;
    private readonly IBus _bus;
    private List<MonitoringItem>? _items;
    private long _itemsUpdateTime;

    public WorkerReadWrite(ILogger<WorkerReadWrite> logger, IBus bus)
    {
        _logger = logger;
        _bus = bus;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            if (_logger.IsEnabled(LogLevel.Information))
            {
                _logger.LogInformation("Worker running at: {time}", DateTimeOffset.Now);
            }

            var controllers = await Core.Controllers.GetSharp7Controllers(x => x.IsDisabled == false);
            var grouped = controllers.GroupBy(x => x.IPAddress);
            await FetchItems();
            var tasks = new List<Task>();

            foreach (var group in grouped)
            {
                tasks.Add(ReadWrite(group));
            }

            await Task.WhenAll(tasks);
            await Task.Delay(1000, stoppingToken);
        }
    }

    private async Task ReadWrite(IGrouping<string, ControllerSharp7> group)
    {
        foreach (var controller in group)
        {
            if (controller.DataType == DataType.Real)
            {
                await ReadWriteRealData(controller);
            }
            else if (controller.DataType == DataType.Bit)
            {
                await ReadWriteBitData(controller);
            }
            else if (controller.DataType == DataType.Integer)
            {
                await ReadWriteIntData(controller);
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

    private async Task FetchItems()
    {
        DateTimeOffset currentTimeUtc = DateTimeOffset.UtcNow;
        long epochTime = currentTimeUtc.ToUnixTimeSeconds();

        if (_items == null || epochTime - _itemsUpdateTime > 60)
        {
            _items = await Core.Points.GetAllPoints();
            _itemsUpdateTime = epochTime;
        }
    }

    private async Task ReadWriteRealData(ControllerSharp7 controller)
    {
        await WriteRealData(controller);
        await ReadRealData(controller);
    }

    private async Task ReadWriteBitData(ControllerSharp7 controller)
    {
        await WriteBitData(controller);
        await ReadBitData(controller);
    }

    private async Task ReadWriteIntData(ControllerSharp7 controller)
    {
        await WriteIntData(controller);
        await ReadIntData(controller);
    }

    private S7Client GetClient(ControllerSharp7 controller)
    {
        S7Client client = new S7Client();

        int result = client.ConnectTo(controller.IPAddress, 0, 1);

        if (result != 0)
        {
            _logger.LogError($"{controller.Name} - {controller.IPAddress}");
            _logger.LogError(client.ErrorText(result));
        }

        return client;
    }

    public async Task ReadRealData(ControllerSharp7 controller)
    {
        S7Client client = null;
        int result = 0;

        try
        {
            client = GetClient(controller);

            byte[] dbBuffer = new byte[controller.DBSizeData];
            result = client.DBRead(controller.DBAddress, controller.DBStartData, controller.DBSizeData, dbBuffer);

            if (result != 0)
            {
                _logger.LogError($"{controller.Name} - {controller.IPAddress}");
                _logger.LogError(client.ErrorText(result));
            }
            else
            {
                var time = DateTimeOffset.UtcNow;
                DateTimeOffset timeOffset = time;
                var epoch = timeOffset.ToUnixTimeSeconds();

                var message = new ReadValuesMessage();

                var maps = await Core.Controllers.GetSharp7Maps(x => x.ControllerId == controller.Id &&
                                                                     x.OperationType == IoOperationType.Read);

                foreach (var map in maps)
                {
                    var pos = map.Position;
                    var value = Math.Round(dbBuffer.GetRealAt(pos), 2).ToString(CultureInfo.InvariantCulture);

                    message.Values.Add(new ReadValuesMessage.ReadValue()
                    {
                        ItemId = map.ItemId,
                        Value = value,
                        Time = epoch,
                    });

                    var output =
                        $"PointNumber: {map.ItemId}, Value: {value}, Time: {time.ToLocalTime().ToString()}";

                    _logger.LogInformation(output);
                }

                client.Disconnect();
                await _bus.Send<ReadValuesMessage>(message);
            }
        }
        catch (Exception e)
        {
            if (client != null)
            {
                client.Disconnect();
            }

            _logger.LogError(e, e.Message);
        }
    }

    public async Task ReadIntData(ControllerSharp7 controller)
    {
        S7Client client = null;
        int result = 0;

        try
        {
            client = GetClient(controller);

            byte[] dbBuffer = new byte[controller.DBSizeData];
            result = client.DBRead(controller.DBAddress, controller.DBStartData, controller.DBSizeData, dbBuffer);

            if (result != 0)
            {
                _logger.LogError($"{controller.Name} - {controller.IPAddress}");
                _logger.LogError(client.ErrorText(result));
            }
            else
            {
                var time = DateTimeOffset.UtcNow;
                DateTimeOffset timeOffset = time;
                var epoch = timeOffset.ToUnixTimeSeconds();

                var message = new ReadValuesMessage();

                var maps = await Core.Controllers.GetSharp7Maps(x => x.ControllerId == controller.Id &&
                                                                     x.OperationType == IoOperationType.Read);

                foreach (var map in maps)
                {
                    var pos = map.Position;
                    var value = dbBuffer.GetIntAt(pos).ToString(CultureInfo.InvariantCulture);

                    message.Values.Add(new ReadValuesMessage.ReadValue()
                    {
                        ItemId = map.ItemId,
                        Value = value,
                        Time = epoch,
                    });

                    var output =
                        $"Read => PointNumber: {map.ItemId}, Value: {value}, Time: {time.ToLocalTime().ToString()}";

                    _logger.LogInformation(output);
                }

                client.Disconnect();
                await _bus.Send<ReadValuesMessage>(message);
            }
        }
        catch (Exception e)
        {
            if (client != null)
            {
                client.Disconnect();
            }

            _logger.LogError(e, e.Message);
        }
    }

    public async Task ReadBitData(ControllerSharp7 controller)
    {
        S7Client client = null;
        int result = 0;

        try
        {
            client = GetClient(controller);

            byte[] dbBuffer = new byte[controller.DBSizeData];
            result = client.DBRead(controller.DBAddress, controller.DBStartData, controller.DBSizeData, dbBuffer);

            if (result != 0)
            {
                _logger.LogError($"{controller.Name} - {controller.IPAddress}");
                _logger.LogError(client.ErrorText(result));
            }
            else
            {
                var time = DateTimeOffset.UtcNow;
                DateTimeOffset timeOffset = time;
                var epoch = timeOffset.ToUnixTimeSeconds();

                var message = new ReadValuesMessage();

                var maps = await Core.Controllers.GetSharp7Maps(x => x.ControllerId == controller.Id &&
                                                                     x.OperationType == IoOperationType.Read);

                foreach (var map in maps)
                {
                    var pos = map.Position;
                    var bit = map.Bit.Value;
                    var value = GetDigitalValue(dbBuffer.GetBitAt(pos, bit));

                    message.Values.Add(new ReadValuesMessage.ReadValue()
                    {
                        ItemId = map.ItemId,
                        Value = value,
                        Time = epoch,
                    });

                    var output =
                        $"PointNumber: {map.ItemId}, Value: {value}, Time: {time.ToLocalTime().ToString()}";

                    _logger.LogInformation(output);
                }

                client.Disconnect();
                await _bus.Send<ReadValuesMessage>(message);
            }
        }
        catch (Exception e)
        {
            if (client != null)
            {
                client.Disconnect();
            }

            _logger.LogError(e, e.Message);
        }
    }

    private static string GetDigitalValue(bool value)
    {
        if (value)
        {
            return "1";
        }

        return "0";
    }

    public async Task WriteIntData(ControllerSharp7 controller)
    {
        S7Client client = null;
        int result = 0;

        try
        {
            client = GetClient(controller);

            var time = DateTimeOffset.UtcNow;
            byte[] dbBuffer = new byte[controller.DBSizeData];

            var maps = await Core.Controllers.GetSharp7Maps(x => x.ControllerId == controller.Id &&
                                                                 x.OperationType == IoOperationType.Write);

            var values = await Core.Points.GetWriteItems();

            foreach (var map in maps)
            {
                var pos = map.Position;
                var matched = values.FirstOrDefault(x => x.ItemId == map.ItemId);
                string? value = "0";

                if (matched != null)
                {
                    var item = _items.FirstOrDefault(x => x.Id == matched.ItemId);
                    
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
                
                MyLog.LogJson("WriteIntData.value",value);
                
                if (float.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out float floatValue))
                {
                    // Convert float to short, checking for overflow
                    short intValue;
                    if (floatValue > short.MaxValue)
                    {
                        intValue = short.MaxValue;
                        _logger.LogWarning(
                            "WriteIntData - Controller {ControllerId}: Value '{Value}' for ItemId {ItemId} exceeds short.MaxValue ({MaxValue}), clamping to {ClampedValue}",
                            controller.Id, value, map.ItemId, short.MaxValue, intValue);
                    }
                    else if (floatValue < short.MinValue)
                    {
                        intValue = short.MinValue;
                        _logger.LogWarning(
                            "WriteIntData - Controller {ControllerId}: Value '{Value}' for ItemId {ItemId} below short.MinValue ({MinValue}), clamping to {ClampedValue}",
                            controller.Id, value, map.ItemId, short.MinValue, intValue);
                    }
                    else
                    {
                        intValue = (short)Math.Round(floatValue);
                    }
                    
                    dbBuffer.SetIntAt(pos, intValue);
                    MyLog.LogJson("WriteIntData.intValue", intValue);
                }

                // if (short.TryParse(value, out short intValue))
                // {
                //     dbBuffer.SetIntAt(pos, intValue);
                //     MyLog.LogJson("WriteIntData.intValue",value);
                // }

                var output =
                    $"Write => PointNumber: {map.ItemId}, Value: {value}, Time: {time.ToLocalTime().ToString()}";

                _logger.LogInformation(output);
            }

            result = client.DBWrite(controller.DBAddress, controller.DBStartData, controller.DBSizeData, dbBuffer);

            if (result != 0)
            {
                _logger.LogError($"{controller.Name} - {controller.IPAddress}");
                _logger.LogError(client.ErrorText(result));
            }

            client.Disconnect();
        }
        catch (Exception e)
        {
            if (client != null)
            {
                client.Disconnect();
            }

            _logger.LogError(e, e.Message);
        }
    }

    public async Task WriteRealData(ControllerSharp7 controller)
    {
        S7Client client = null;
        int result = 0;

        try
        {
            client = GetClient(controller);

            byte[] dbBuffer = new byte[controller.DBSizeData];

            var maps = await Core.Controllers.GetSharp7Maps(x => x.ControllerId == controller.Id &&
                                                                 x.OperationType == IoOperationType.Write);

            var values = await Core.Points.GetWriteItems();

            foreach (var map in maps)
            {
                var pos = map.Position;
                var matched = values.FirstOrDefault(x => x.ItemId == map.ItemId);
                string? value = "0";

                if (matched != null)
                {
                    var item = _items.FirstOrDefault(x => x.Id == matched.ItemId);
                    
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
                
                MyLog.LogJson("WriteRealData.value",value);

                if (float.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out float floatValue))
                {
                    dbBuffer.SetRealAt(pos, floatValue);
                    MyLog.LogJson("WriteRealData.floatValue",floatValue);
                }
            }

            result = client.DBWrite(controller.DBAddress, controller.DBStartData, controller.DBSizeData, dbBuffer);

            if (result != 0)
            {
                _logger.LogError($"{controller.Name} - {controller.IPAddress}");
                _logger.LogError(client.ErrorText(result));
            }

            client.Disconnect();
        }
        catch (Exception e)
        {
            if (client != null)
            {
                client.Disconnect();
            }

            _logger.LogError(e, e.Message);
        }
    }

    public async Task WriteBitData(ControllerSharp7 controller)
    {
        S7Client client = null;
        int result = 0;

        try
        {
            client = GetClient(controller);

            byte[] dbBuffer = new byte[controller.DBSizeData];

            var maps = await Core.Controllers.GetSharp7Maps(x => x.ControllerId == controller.Id &&
                                                                 x.OperationType == IoOperationType.Write);

            var values = await Core.Points.GetWriteItems();

            foreach (var map in maps)
            {
                var pos = map.Position;
                var bit = map.Bit.Value;
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
                    dbBuffer.SetBitAt(pos, bit, true);
                }
                else
                {
                    dbBuffer.SetBitAt(pos, bit, false);
                }
            }

            result = client.DBWrite(controller.DBAddress, controller.DBStartData, controller.DBSizeData, dbBuffer);

            if (result != 0)
            {
                _logger.LogError($"{controller.Name} - {controller.IPAddress}");
                _logger.LogError(client.ErrorText(result));
            }

            client.Disconnect();
        }
        catch (Exception e)
        {
            if (client != null)
            {
                client.Disconnect();
            }

            _logger.LogError(e, e.Message);
        }
    }
}