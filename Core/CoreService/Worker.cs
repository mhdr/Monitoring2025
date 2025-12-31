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

        _logger.LogInformation("Start Processing Schedule Memories...");
        var task9 = ScheduleMemoryProcess.Instance.Run();

        _logger.LogInformation("Start Processing Statistical Memories...");
        var task10 = StatisticalMemoryProcess.Instance.Run();

        _logger.LogInformation("Start Processing Formula Memories...");
        var task11 = FormulaMemoryProcess.Instance.Run();

        _logger.LogInformation("Start Processing IF Memories...");
        var task12 = IfMemoryProcess.Instance.Run();

        _logger.LogInformation("Start Processing Deadband Memories...");
        var task13 = DeadbandMemoryProcess.Instance.Run();

        _logger.LogInformation("Start Processing Min/Max Selector Memories...");
        var task14 = MinMaxSelectorMemoryProcess.Instance.Run();

        _logger.LogInformation("Start Processing Write Action Memories...");
        var task15 = WriteActionMemoryProcess.Instance.Run();

        await Task.WhenAll(task1, task2, task3, task4, task5, task6, task7, task8, task9, task10, task11, task12, task13, task14, task15);
        Console.ReadKey();
    }
}