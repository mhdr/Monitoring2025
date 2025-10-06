using API.Libs;
using Core.Models;
using Microsoft.AspNetCore.SignalR;

namespace API.Workers;

public class ActiveAlarmsBackgroundWorker : IHostedService, IDisposable
{
    private Thread? _workerThread;
    private CancellationTokenSource _cts;
    private bool _disposed = false;
    private List<ActiveAlarm>? _activeAlarms = null;
    private readonly IHubContext<MyHub> _hubContext;

    public ActiveAlarmsBackgroundWorker(IHubContext<MyHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _workerThread = new Thread(Start);
        _workerThread.Start();
        return Task.CompletedTask;
    }

    private async void Start()
    {
        await WorkerThread();
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        if (_workerThread != null)
        {
            _cts.Cancel();
            _workerThread.Join();
        }

        return Task.CompletedTask;
    }

    private async Task WorkerThread()
    {
        while (!_cts.Token.IsCancellationRequested)
        {
            try
            {
                // Perform background work here
                var alarms = await ActiveAlarms();

                if (alarms != null)
                {
                    await _hubContext.Clients.All.SendAsync("ActiveAlarms", alarms.Count.ToString());
                }

                // Thread.Sleep(1000); // Sleep for 1 seconds between checks
                await Task.Delay(1000, _cts.Token);
            }
            catch (Exception e)
            {
                // MyLog.LogJson("ex", e);
            }
        }
    }

    private async Task<List<ActiveAlarm>?> ActiveAlarms()
    {
        var alarms = await Core.Alarms.ActiveAlarms();
        if (_activeAlarms == null)
        {
            _activeAlarms = alarms;
        }
        else
        {
            var currentDigest = GetDigest(alarms);
            var prevDigest = GetDigest(_activeAlarms);

            if (currentDigest != prevDigest)
            {
                _activeAlarms = alarms;
                return alarms;
            }
        }

        return null;
    }

    public string GetDigest(List<ActiveAlarm> activeAlarms)
    {
        string result = "";

        foreach (var activeAlarm in activeAlarms)
        {
            result += activeAlarm.Id;
        }

        return result;
    }

    public void Dispose()
    {
        _activeAlarms = null;
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!_disposed)
        {
            if (disposing)
            {
                _cts?.Dispose();
            }

            _disposed = true;
        }
    }
}