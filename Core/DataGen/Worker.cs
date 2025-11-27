using Contracts;
using Core;
using Core.Libs;
using Core.Models;
using MassTransit;

namespace DataGen;

public class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;
    private readonly IBus _bus;
    private List<MonitoringItem> _items = new();
    private double _time = 0;
    private readonly Random _random = new();

    public Worker(ILogger<Worker> logger, IBus bus)
    {
        _logger = logger;
        _bus = bus;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("DataGen Worker starting...");
        
        // Initialize items in database
        await InitializeItems();
        
        _logger.LogInformation("Starting data generation loop...");
        
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await GenerateAndSendData();
                _time += 0.1; // Increment time for pattern generation
                
                if (_logger.IsEnabled(LogLevel.Debug))
                {
                    _logger.LogDebug("Data generated at: {time}", DateTimeOffset.Now);
                }
                
                await Task.Delay(2000, stoppingToken); // 2 seconds delay
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in data generation loop");
                await Task.Delay(5000, stoppingToken);
            }
        }
    }

    private async Task InitializeItems()
    {
        _logger.LogInformation("Checking and initializing monitoring items...");
        
        try
        {
            // Check if items already exist
            var existingItems = await Points.ListPoints(x => x.PointNumber >= 1 && x.PointNumber <= 50);
            
            if (existingItems.Count >= 50)
            {
                _logger.LogInformation("Items already exist in database. Found {Count} items.", existingItems.Count);
                _items = existingItems;
                return;
            }
            
            _logger.LogInformation("Creating 50 new monitoring items...");
            
            var context = new DataContext();
            
            // Create 50 items
            for (int i = 1; i <= 50; i++)
            {
                var itemType = (i % 2 == 0) ? ItemType.AnalogInput : ItemType.DigitalInput;
                
                var item = new MonitoringItem
                {
                    ItemType = itemType,
                    ItemName = itemType == ItemType.AnalogInput 
                        ? $"Analog Test {i}" 
                        : $"Digital Test {i}",
                    ItemNameFa = itemType == ItemType.AnalogInput 
                        ? $"ورودی آنالوگ تست {i}" 
                        : $"ورودی دیجیتال تست {i}",
                    PointNumber = i,
                    ShouldScale = ShouldScaleType.Off,
                    ScaleMin = itemType == ItemType.AnalogInput ? 0 : 0,
                    ScaleMax = itemType == ItemType.AnalogInput ? 100 : 1,
                    SaveInterval = 4,
                    SaveHistoricalInterval = 60,
                    OnText = "ON",
                    OnTextFa = "روشن",
                    OffText = "OFF",
                    OffTextFa = "خاموش",
                    Unit = itemType == ItemType.AnalogInput ? "%" : "",
                    UnitFa = itemType == ItemType.AnalogInput ? "درصد" : "",
                    IsDisabled = false,
                    InterfaceType = InterfaceType.None,
                    IsEditable = false
                };
                
                context.MonitoringItems.Add(item);
            }
            
            await context.SaveChangesAsync();
            _logger.LogInformation("Successfully created 50 monitoring items");
            
            // Reload items
            _items = await Points.ListPoints(x => x.PointNumber >= 1 && x.PointNumber <= 50);
            _logger.LogInformation("Loaded {Count} items for data generation", _items.Count);
            
            await context.DisposeAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initializing items");
            throw;
        }
    }

    private async Task GenerateAndSendData()
    {
        if (_items.Count == 0)
        {
            _logger.LogWarning("No items loaded. Attempting to reload...");
            await InitializeItems();
            return;
        }
        
        var message = new ReadValuesMessage();
        var currentTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        
        foreach (var item in _items)
        {
            string value;
            
            if (item.ItemType == ItemType.AnalogInput)
            {
                // Generate different patterns for analog inputs
                value = GenerateAnalogValue(item.PointNumber).ToString("F2");
            }
            else // DigitalInput
            {
                // Generate digital values (0 or 1)
                value = GenerateDigitalValue(item.PointNumber).ToString();
            }
            
            message.Values.Add(new ReadValuesMessage.ReadValue
            {
                ItemId = item.Id,
                Value = value,
                Time = currentTime
            });
        }
        
        // Publish to RabbitMQ
        await _bus.Publish(message);
        
        _logger.LogInformation("Published {Count} values to RabbitMQ", message.Values.Count);
    }

    private double GenerateAnalogValue(int pointNumber)
    {
        // More complex patterns simulating real sensor behaviors
        switch (pointNumber % 10)
        {
            case 0: // Temperature sensor - slow sinusoidal with daily cycle + noise
                var temp = 20 + 10 * Math.Sin(_time / 10) + 
                          2 * Math.Sin(_time * 3) + 
                          (_random.NextDouble() - 0.5) * 0.5;
                return Math.Max(0, Math.Min(100, temp));
                
            case 1: // Pressure sensor - baseline with periodic spikes
                var pressure = 50 + 5 * Math.Sin(_time / 8);
                if (Math.Sin(_time * 5) > 0.9) // Occasional spike
                    pressure += 15;
                pressure += (_random.NextDouble() - 0.5) * 2;
                return Math.Max(0, Math.Min(100, pressure));
                
            case 2: // Flow rate - pulsating pattern with harmonics
                var flow = 60 + 20 * Math.Sin(_time) + 
                          10 * Math.Sin(_time * 2) + 
                          5 * Math.Sin(_time * 3) +
                          (_random.NextDouble() - 0.5) * 3;
                return Math.Max(0, Math.Min(100, flow));
                
            case 3: // Vibration sensor - random with sudden bursts
                double vibration;
                if (_random.NextDouble() > 0.95) // 5% chance of burst
                    vibration = 70 + _random.NextDouble() * 30;
                else
                    vibration = 15 + _random.NextDouble() * 10 + 5 * Math.Sin(_time * 8);
                return Math.Max(0, Math.Min(100, vibration));
                
            case 4: // Level sensor - slowly rising and falling tank
                var level = 50 + 40 * Math.Sin(_time / 15) + 
                           (_random.NextDouble() - 0.5) * 1;
                return Math.Max(0, Math.Min(100, level));
                
            case 5: // Power consumption - daily pattern with load variations
                var basePower = 45 + 20 * Math.Sin(_time / 12); // Daily cycle
                var loadVariation = 15 * Math.Sin(_time * 2); // Load changes
                var power = basePower + loadVariation + (_random.NextDouble() - 0.5) * 3;
                return Math.Max(0, Math.Min(100, power));
                
            case 6: // Humidity sensor - gradual changes with weather patterns
                var humidity = 55 + 25 * Math.Sin(_time / 20) + // Slow trend
                              8 * Math.Sin(_time / 3) + // Weather changes
                              (_random.NextDouble() - 0.5) * 2;
                return Math.Max(0, Math.Min(100, humidity));
                
            case 7: // Motor speed - stepped pattern with transitions
                var targetSpeed = Math.Floor(_time / 5) % 4; // Steps every 5 time units
                var speed = targetSpeed * 25 + 
                           5 * Math.Sin(_time * 10) + // Oscillation
                           (_random.NextDouble() - 0.5) * 2;
                return Math.Max(0, Math.Min(100, speed));
                
            case 8: // Chemical concentration - exponential decay with additions
                var baseConc = 70 * Math.Exp(-_time / 30); // Decay
                if (Math.Sin(_time / 8) > 0.95) // Periodic additions
                    baseConc += 30;
                baseConc = Math.Max(20, baseConc); // Minimum baseline
                baseConc += (_random.NextDouble() - 0.5) * 1.5;
                return Math.Max(0, Math.Min(100, baseConc));
                
            case 9: // Position sensor - smooth ramp up/down with overshoot
                var cycle = _time % 20;
                double position;
                if (cycle < 10)
                    position = cycle * 10; // Ramp up
                else
                    position = (20 - cycle) * 10; // Ramp down
                position += 5 * Math.Sin(_time * 5); // Overshoot/oscillation
                position += (_random.NextDouble() - 0.5) * 1;
                return Math.Max(0, Math.Min(100, position));
                
            default:
                return 50;
        }
    }

    private int GenerateDigitalValue(int pointNumber)
    {
        // Different patterns for digital values
        switch (pointNumber % 4)
        {
            case 0: // Fast toggle based on sine
                return Math.Sin(_time * 2) >= 0 ? 1 : 0;
                
            case 1: // Slow toggle based on sine
                return Math.Sin(_time / 2) >= 0 ? 1 : 0;
                
            case 2: // Random with 70% probability of being ON
                return _random.NextDouble() > 0.3 ? 1 : 0;
                
            case 3: // Mostly OFF (10% probability of being ON)
                return _random.NextDouble() < 0.1 ? 1 : 0;
                
            default:
                return 0;
        }
    }
}
