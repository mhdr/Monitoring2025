using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ModbusGateway;

/// <summary>
/// Background service that manages Modbus TCP server gateways.
/// Loads configurations on startup, periodically updates register values,
/// and publishes status updates via MassTransit.
/// </summary>
public class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;
    private readonly GatewayManager _gatewayManager;

    /// <summary>
    /// Interval for updating register values from monitoring data (milliseconds).
    /// </summary>
    private const int RegisterUpdateIntervalMs = 500;

    /// <summary>
    /// Interval for publishing status updates (milliseconds).
    /// </summary>
    private const int StatusUpdateIntervalMs = 5000;

    /// <summary>
    /// Interval for refreshing items cache (milliseconds).
    /// </summary>
    private const int ItemsCacheRefreshIntervalMs = 60000;

    public Worker(ILogger<Worker> logger, GatewayManager gatewayManager)
    {
        _logger = logger;
        _gatewayManager = gatewayManager;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ModbusGateway Worker starting at: {time}", DateTimeOffset.Now);

        // Wait a bit for other services to be ready
        await Task.Delay(2000, stoppingToken);

        try
        {
            // Load and start all enabled gateways
            await _gatewayManager.LoadAndStartAllAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load gateways on startup");
        }

        var registerUpdateTask = RegisterUpdateLoopAsync(stoppingToken);
        var statusUpdateTask = StatusUpdateLoopAsync(stoppingToken);
        var cacheRefreshTask = CacheRefreshLoopAsync(stoppingToken);

        // Wait for all tasks (they will run until cancellation)
        await Task.WhenAll(registerUpdateTask, statusUpdateTask, cacheRefreshTask);

        _logger.LogInformation("ModbusGateway Worker stopping at: {time}", DateTimeOffset.Now);
    }

    /// <summary>
    /// Loop that periodically updates register values from monitoring data.
    /// </summary>
    private async Task RegisterUpdateLoopAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await _gatewayManager.UpdateAllRegistersAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in register update loop");
            }

            await Task.Delay(RegisterUpdateIntervalMs, stoppingToken);
        }
    }

    /// <summary>
    /// Loop that periodically publishes gateway status updates.
    /// </summary>
    private async Task StatusUpdateLoopAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await _gatewayManager.PublishStatusUpdatesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in status update loop");
            }

            await Task.Delay(StatusUpdateIntervalMs, stoppingToken);
        }
    }

    /// <summary>
    /// Loop that periodically refreshes the monitoring items cache.
    /// </summary>
    private async Task CacheRefreshLoopAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await _gatewayManager.RefreshItemsCacheIfNeededAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in cache refresh loop");
            }

            await Task.Delay(ItemsCacheRefreshIntervalMs, stoppingToken);
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("ModbusGateway Worker stopping...");
        
        _gatewayManager.StopAll();
        _gatewayManager.Dispose();

        await base.StopAsync(cancellationToken);
    }
}
