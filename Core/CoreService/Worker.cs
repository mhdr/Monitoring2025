using Core;

namespace CoreService;

public class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;

    public Worker(ILogger<Worker> logger)
    {
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Start Processing Points...");
        var task1 = MonitoringProcess.Instance.Run();

        _logger.LogInformation("Start Processing Alarms...");
        var task2 = AlarmProcess.Instance.Run();

        _logger.LogInformation("Start Processing Timeout Memories...");
        var task3 = TimeoutMemoryProcess.Instance.Run();

        _logger.LogInformation("Start Processing PID Memories...");
        var task4 = PIDMemoryProcess.Instance.Run();

        await Task.WhenAll(task1, task2, task3, task4);
        Console.ReadKey();
    }
}