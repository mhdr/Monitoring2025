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

        _logger.LogInformation("Start Processing PID Auto-Tuning...");
        var task5 = PIDTuningProcess.Instance.Run();

        _logger.LogInformation("Start Processing Average Memories...");
        var task6 = AverageMemoryProcess.Instance.Run();

        _logger.LogInformation("Start Processing Totalizer Memories...");
        var task7 = TotalizerMemoryProcess.Instance.Run();

        _logger.LogInformation("Start Processing Rate of Change Memories...");
        var task8 = RateOfChangeMemoryProcess.Instance.Run();

        await Task.WhenAll(task1, task2, task3, task4, task5, task6, task7, task8);
        Console.ReadKey();
    }
}