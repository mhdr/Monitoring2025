using System.Collections.Concurrent;
using Contracts;
using Core;
using Core.Models;
using MassTransit;
using Microsoft.Extensions.Logging;

namespace ModbusGateway;

/// <summary>
/// Manages multiple Modbus TCP server gateway instances.
/// Handles lifecycle (start/stop/restart) and configuration updates.
/// </summary>
public class GatewayManager : IDisposable
{
    private readonly ILogger<GatewayManager> _logger;
    private readonly ILoggerFactory _loggerFactory;
    private readonly IBus _bus;
    private readonly ConcurrentDictionary<Guid, GatewayInstance> _gateways;
    private readonly object _lock = new();
    private Dictionary<Guid, MonitoringItem> _itemsCache;
    private long _itemsCacheUpdateTime;

    public GatewayManager(ILogger<GatewayManager> logger, ILoggerFactory loggerFactory, IBus bus)
    {
        _logger = logger;
        _loggerFactory = loggerFactory;
        _bus = bus;
        _gateways = new ConcurrentDictionary<Guid, GatewayInstance>();
        _itemsCache = new Dictionary<Guid, MonitoringItem>();
    }

    /// <summary>
    /// Loads and starts all enabled gateways from the database.
    /// </summary>
    public async Task LoadAndStartAllAsync()
    {
        try
        {
            _logger.LogInformation("Loading enabled gateways from database...");
            var configs = await Controllers.GetEnabledGateways();
            _logger.LogInformation("Found {Count} enabled gateways", configs.Count);

            // Load items cache
            await RefreshItemsCacheAsync();

            foreach (var config in configs)
            {
                try
                {
                    await StartGatewayAsync(config);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to start gateway {Name} ({Id})", config.Name, config.Id);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load gateways from database");
        }
    }

    /// <summary>
    /// Starts a gateway with the given configuration.
    /// </summary>
    public async Task StartGatewayAsync(ModbusGatewayConfig config)
    {
        if (_gateways.ContainsKey(config.Id))
        {
            _logger.LogWarning("Gateway {Name} is already running", config.Name);
            return;
        }

        var instanceLogger = _loggerFactory.CreateLogger($"Gateway-{config.Name}");
        var instance = new GatewayInstance(config, instanceLogger);

        // Update items cache
        lock (_lock)
        {
            instance.UpdateItemsCache(_itemsCache);
        }

        instance.Start();

        if (_gateways.TryAdd(config.Id, instance))
        {
            _logger.LogInformation("Gateway {Name} started successfully", config.Name);
        }

        await Task.CompletedTask;
    }

    /// <summary>
    /// Starts a gateway by ID, loading configuration from database.
    /// </summary>
    public async Task StartGatewayAsync(Guid gatewayId)
    {
        var config = await Controllers.GetModbusGatewayConfig(gatewayId);
        if (config == null)
        {
            _logger.LogWarning("Gateway {Id} not found in database", gatewayId);
            return;
        }

        if (!config.IsEnabled)
        {
            _logger.LogWarning("Gateway {Name} is disabled, skipping start", config.Name);
            return;
        }

        await StartGatewayAsync(config);
    }

    /// <summary>
    /// Stops a gateway by ID.
    /// </summary>
    public void StopGateway(Guid gatewayId)
    {
        if (_gateways.TryRemove(gatewayId, out var instance))
        {
            instance.Stop();
            instance.Dispose();
            _logger.LogInformation("Gateway {Name} stopped", instance.Name);
        }
    }

    /// <summary>
    /// Restarts a gateway by ID (reload configuration from database).
    /// </summary>
    public async Task RestartGatewayAsync(Guid gatewayId)
    {
        _logger.LogInformation("Restarting gateway {Id}", gatewayId);

        StopGateway(gatewayId);
        
        // Small delay to ensure port is released
        await Task.Delay(100);

        await StartGatewayAsync(gatewayId);
    }

    /// <summary>
    /// Updates a gateway's mappings (for config changes that don't require restart).
    /// </summary>
    public async Task UpdateGatewayMappingsAsync(Guid gatewayId)
    {
        if (!_gateways.TryGetValue(gatewayId, out var instance))
        {
            _logger.LogWarning("Gateway {Id} not found for mapping update", gatewayId);
            return;
        }

        var mappings = await Controllers.GetModbusGatewayMappings(gatewayId);
        instance.UpdateMappings(mappings);

        _logger.LogInformation("Updated mappings for gateway {Name} ({Count} mappings)",
            instance.Name, mappings.Count);
    }

    /// <summary>
    /// Refreshes the monitoring items cache used for IsEditable validation.
    /// </summary>
    public async Task RefreshItemsCacheAsync()
    {
        try
        {
            var items = await Points.GetAllPoints();
            var newCache = items.ToDictionary(i => i.Id, i => i);

            lock (_lock)
            {
                _itemsCache = newCache;
                _itemsCacheUpdateTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            }

            // Update all running instances
            foreach (var instance in _gateways.Values)
            {
                lock (_lock)
                {
                    instance.UpdateItemsCache(_itemsCache);
                }
            }

            _logger.LogDebug("Refreshed items cache with {Count} items", items.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to refresh items cache");
        }
    }

    /// <summary>
    /// Updates all gateway registers from monitoring data.
    /// </summary>
    public async Task UpdateAllRegistersAsync()
    {
        var tasks = _gateways.Values.Select(g => g.UpdateRegistersAsync()).ToList();
        await Task.WhenAll(tasks);
    }

    /// <summary>
    /// Publishes status updates for all running gateways.
    /// </summary>
    public async Task PublishStatusUpdatesAsync()
    {
        foreach (var instance in _gateways.Values)
        {
            try
            {
                var message = new GatewayStatusMessage(
                    instance.GatewayId,
                    instance.Name,
                    instance.ConnectedClients,
                    instance.LastReadTime,
                    instance.LastWriteTime
                );

                await _bus.Publish(message);

                // Also update database
                await Controllers.UpdateGatewayStatus(
                    instance.GatewayId,
                    instance.ConnectedClients,
                    instance.LastReadTime,
                    instance.LastWriteTime
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish status for gateway {Name}", instance.Name);
            }
        }
    }

    /// <summary>
    /// Handles configuration change messages.
    /// </summary>
    public async Task HandleConfigChangedAsync(GatewayConfigChangedMessage message)
    {
        _logger.LogInformation("Received config change: Gateway {Id}, Type: {Type}",
            message.GatewayId, message.ChangeType);

        switch (message.ChangeType)
        {
            case GatewayConfigChangeType.Added:
                await StartGatewayAsync(message.GatewayId);
                break;

            case GatewayConfigChangeType.Updated:
                await RestartGatewayAsync(message.GatewayId);
                break;

            case GatewayConfigChangeType.Deleted:
                StopGateway(message.GatewayId);
                break;
        }
    }

    /// <summary>
    /// Gets the status of all running gateways.
    /// </summary>
    public List<(Guid Id, string Name, bool IsRunning, int ConnectedClients, DateTime? LastRead, DateTime? LastWrite)> GetAllStatus()
    {
        return _gateways.Values.Select(g => (
            g.GatewayId,
            g.Name,
            g.IsRunning,
            g.ConnectedClients,
            g.LastReadTime,
            g.LastWriteTime
        )).ToList();
    }

    /// <summary>
    /// Checks if items cache needs refresh (every 60 seconds).
    /// </summary>
    public async Task RefreshItemsCacheIfNeededAsync()
    {
        long currentTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        
        bool needsRefresh;
        lock (_lock)
        {
            needsRefresh = currentTime - _itemsCacheUpdateTime > 60;
        }

        if (needsRefresh)
        {
            await RefreshItemsCacheAsync();
        }
    }

    /// <summary>
    /// Stops all running gateways.
    /// </summary>
    public void StopAll()
    {
        _logger.LogInformation("Stopping all gateways...");
        
        foreach (var gatewayId in _gateways.Keys.ToList())
        {
            StopGateway(gatewayId);
        }

        _logger.LogInformation("All gateways stopped");
    }

    public void Dispose()
    {
        StopAll();
        _gateways.Clear();
    }
}
