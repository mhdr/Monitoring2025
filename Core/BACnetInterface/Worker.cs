using System.Globalization;
using System.IO.BACnet;
using Contracts;
using Core.Libs;
using Core.Models;
using MassTransit;

namespace BACnetInterface;

public class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;
    private BacnetClient _bacnetClient;

    private readonly IBus _bus;

    // All the present Bacnet Device List
    private Dictionary<uint, BACnetNode> _baCnetNodes = new();

    public Worker(ILogger<Worker> logger, IBus bus)
    {
        _logger = logger;
        _bus = bus;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Bacnet on UDP/IP/Ethernet
        _bacnetClient = new BacnetClient(new BacnetIpUdpProtocolTransport(0xBAC0, false));
        _bacnetClient.Start();

        _bacnetClient.OnIam += handler_OnIam;
        _bacnetClient.WhoIs();

        while (!stoppingToken.IsCancellationRequested)
        {
            if (_logger.IsEnabled(LogLevel.Information))
            {
                _logger.LogInformation("Worker running at: {time}", DateTimeOffset.Now);
            }

            var controllers = await Core.Controllers.GetBACnetControllers(x => x.IsDisabled == false);

            foreach (var controller in controllers)
            {
                if (_baCnetNodes.ContainsKey((uint)controller.DeviceId))
                {
                    await ReadAnalogInputs(controller);
                    await Task.Delay(10, stoppingToken);
                    await ReadAnalogOutputs(controller);
                }

                await Task.Delay(10, stoppingToken);
            }

            await Task.Delay(100, stoppingToken);
        }
    }

    private async Task ReadAnalogOutputs(ControllerBACnet controller)
    {
        try
        {
            var maps = await Core.Controllers.GetBACnetMaps(x => x.ControllerId == controller.Id &&
                                                                 x.ObjectType == BACnetObjectType.AnalogOutput &&
                                                                 x.OperationType == IoOperationType.Read);

            var time = DateTimeOffset.UtcNow;
            DateTimeOffset timeOffset = time;
            var epoch = timeOffset.ToUnixTimeSeconds();

            var message = new ReadValuesMessage();

            foreach (var map in maps)
            {
                BacnetValue Value;
                bool ret;

                ret = ReadScalarValue((uint)controller.DeviceId,
                    new BacnetObjectId(BacnetObjectTypes.OBJECT_ANALOG_OUTPUT, (uint)map.ObjectId),
                    BacnetPropertyIds.PROP_PRESENT_VALUE, out Value);

                if (ret)
                {
                    string value = Value.Value.ToString() ?? string.Empty;

                    if (!string.IsNullOrEmpty(value))
                    {
                        double.TryParse(value, out double parsedValue);
                        var roundedValue = Math.Round(parsedValue, 2);
                        var valueStr = roundedValue.ToString(CultureInfo.InvariantCulture);

                        message.Values.Add(new ReadValuesMessage.ReadValue()
                        {
                            ItemId = map.ItemId,
                            Value = valueStr,
                            Time = epoch,
                        });

                        var output =
                            $"PointNumber: {map.ItemId}, Value: {value}, Time: {time.ToLocalTime().ToString()}";

                        _logger.LogInformation(output);
                    }
                }
            }

            await _bus.Send<ReadValuesMessage>(message);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }
    }

    public async Task ReadAnalogInputs(ControllerBACnet controller)
    {
        try
        {
            var maps = await Core.Controllers.GetBACnetMaps(x => x.ControllerId == controller.Id &&
                                                                 x.ObjectType == BACnetObjectType.AnalogInput &&
                                                                 x.OperationType == IoOperationType.Read);

            var time = DateTimeOffset.UtcNow;
            DateTimeOffset timeOffset = time;
            var epoch = timeOffset.ToUnixTimeSeconds();

            var message = new ReadValuesMessage();

            foreach (var map in maps)
            {
                BacnetValue Value;
                bool ret;

                ret = ReadScalarValue((uint)controller.DeviceId,
                    new BacnetObjectId(BacnetObjectTypes.OBJECT_ANALOG_INPUT, (uint)map.ObjectId),
                    BacnetPropertyIds.PROP_PRESENT_VALUE, out Value);

                if (ret)
                {
                    string value = Value.Value.ToString() ?? string.Empty;

                    if (!string.IsNullOrEmpty(value))
                    {
                        double.TryParse(value, out double parsedValue);
                        var roundedValue = Math.Round(parsedValue, 2);
                        var valueStr = roundedValue.ToString(CultureInfo.InvariantCulture);

                        message.Values.Add(new ReadValuesMessage.ReadValue()
                        {
                            ItemId = map.ItemId,
                            Value = valueStr,
                            Time = epoch,
                        });

                        var output =
                            $"PointNumber: {map.ItemId}, Value: {value}, Time: {time.ToLocalTime().ToString()}";

                        _logger.LogInformation(output);
                    }
                }
            }

            await _bus.Send<ReadValuesMessage>(message);
        }
        catch (Exception e)
        {
            _logger.LogError(e, e.Message);
        }
    }

    public bool ReadScalarValue(uint deviceId, BacnetObjectId bacnetObjet, BacnetPropertyIds propriete,
        out BacnetValue value)
    {
        BacnetAddress adr;
        IList<BacnetValue> noScalarValue;

        value = new BacnetValue(null);

        // Looking for the device

        var node = _baCnetNodes[deviceId];
        adr = node.adr;

        // Property Read
        if (_bacnetClient.ReadPropertyRequest(adr, bacnetObjet, propriete, out noScalarValue) == false)
            return false;

        value = noScalarValue[0];
        return true;
    }

    void handler_OnIam(BacnetClient sender, BacnetAddress adr, uint device_id, uint max_apdu,
        BacnetSegmentations segmentation, ushort vendor_id)
    {
        lock (_baCnetNodes)
        {
            if (!_baCnetNodes.ContainsKey(device_id))
            {
                _baCnetNodes.Add(device_id, new BACnetNode()
                {
                    sender = sender,
                    adr = adr,
                    device_id = device_id,
                    max_apdu = max_apdu,
                    segmentation = segmentation,
                    vendor_id = vendor_id,
                });
            }
        }

        Console.WriteLine($"Address: {adr}, Device Id: {device_id}");
    }
}