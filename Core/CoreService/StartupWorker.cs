using Core;
using Core.Libs;
using Microsoft.EntityFrameworkCore;

namespace CoreService;

public class StartupWorker: BackgroundService
{
    private readonly ILogger<StartupWorker> _logger;

    public StartupWorker(ILogger<StartupWorker> logger)
    {
        _logger = logger;
    }
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Settings.Init();
        await Points.ApplyInterfaceTypes();
    }
}