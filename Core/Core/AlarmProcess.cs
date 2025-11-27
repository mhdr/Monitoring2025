using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;
using System.Diagnostics;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace Core
{
    public class AlarmProcess
    {
        // Singleton instance
        private static AlarmProcess? _instance;
        private static readonly object _lock = new object();
        private static Task? _runTask;

        private DataContext? _context;
        private ConcurrentDictionary<Guid, MonitorAlarm> _monitorAlarms;

        // Private constructor to enforce Singleton
        private AlarmProcess()
        {
            _context = null;
            _monitorAlarms = new ConcurrentDictionary<Guid, MonitorAlarm>();
        }

        // Singleton instance access
        public static AlarmProcess Instance
        {
            get
            {
                lock (_lock) // Ensure thread-safe access to the instance
                {
                    if (_instance == null)
                    {
                        _instance = new AlarmProcess();
                    }
                }

                return _instance;
            }
        }

        // The Run method (ensures it's executed only once)
        public async Task Run()
        {
            lock (_lock)
            {
                if (_runTask == null)
                {
                    _runTask = Task.Run(async () =>
                    {
                        // Wait for database to be ready at startup
                        await WaitForDatabaseConnection();
                        
                        while (true)
                        {
                            var correlationId = MyLog.NewCorrelationId();
                            try
                            {
                                await using (_context = new DataContext())
                                {
                                    var alarms = await _context.Alarms.AsNoTracking().ToListAsync();
                                    // var finals = await _context.FinalItems.AsNoTracking().ToListAsync();
                                    var finals = await Points.GetFinalItems();
                                    long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                                    var activeAlarms = await _context.ActiveAlarms.ToListAsync();

                                    MyLog.Debug("Starting alarm check cycle", new Dictionary<string, object?>
                                    {
                                        ["AlarmCount"] = alarms.Count,
                                        ["FinalItemCount"] = finals.Count,
                                        ["ActiveAlarmCount"] = activeAlarms.Count,
                                        ["CorrelationId"] = correlationId
                                    });

                                    int alarmsProcessed = 0;
                                    int alarmsTriggered = 0;
                                    int alarmsCleared = 0;

                                    foreach (var a in alarms)
                                    {
                                        try
                                        {
                                            alarmsProcessed++;
                                            MonitorAlarm? monitorAlarm = null;
                                            var hasAlarm = false;
                                            var isChanged = false;

                                            if (!_monitorAlarms.TryGetValue(a.Id, out monitorAlarm))
                                            {
                                                monitorAlarm = new MonitorAlarm()
                                                {
                                                    Id = a.Id,
                                                    Status = AlarmStatus.NoAlarm,
                                                    Time = now,
                                                };
                                                _monitorAlarms[a.Id] = monitorAlarm;
                                            }

                                            var f = finals.FirstOrDefault(x => x.ItemId == a.ItemId);

                                            if (f == null)
                                            {
                                                continue;
                                            }

                                            if (string.IsNullOrEmpty(f.Value))
                                            {
                                                continue;
                                            }

                                            double currentValue = Convert.ToDouble(f.Value);

                                            if (a.AlarmType == AlarmType.Comparative)
                                            {
                                                double value1 = Convert.ToDouble(a.Value1);

                                                if (a.CompareType == CompareType.Higher)
                                                {
                                                    if (currentValue >= value1)
                                                    {
                                                        hasAlarm = true;
                                                    }
                                                }
                                                else if (a.CompareType == CompareType.Lower)
                                                {
                                                    if (currentValue <= value1)
                                                    {
                                                        hasAlarm = true;
                                                    }
                                                }
                                                else if (a.CompareType == CompareType.Equal)
                                                {
                                                    if (currentValue == value1)
                                                    {
                                                        hasAlarm = true;
                                                    }
                                                }
                                                else if (a.CompareType == CompareType.NotEqual)
                                                {
                                                    if (currentValue != value1)
                                                    {
                                                        hasAlarm = true;
                                                    }
                                                }
                                                else if (a.CompareType == CompareType.Between)
                                                {
                                                    if (!string.IsNullOrEmpty(a.Value2))
                                                    {
                                                        if (currentValue > value1 &&
                                                            currentValue < Convert.ToDouble(a.Value2))
                                                        {
                                                            hasAlarm = true;
                                                        }
                                                    }
                                                }
                                            }
                                            else if (a.AlarmType == AlarmType.Timeout && a.Timeout != null)
                                            {
                                                if (now - f.Time > a.Timeout)
                                                {
                                                    hasAlarm = true;
                                                }
                                            }

                                            if (hasAlarm)
                                            {
                                                if (a.IsDisabled)
                                                {
                                                    monitorAlarm.Status = AlarmStatus.NoAlarm;
                                                    monitorAlarm.Time = now;

                                                    var activeAlarm =
                                                        activeAlarms.FirstOrDefault(x => x.AlarmId == a.Id);

                                                    if (activeAlarm != null)
                                                    {
                                                        isChanged = true;
                                                    }
                                                }
                                                else
                                                {
                                                    if (monitorAlarm.Status == AlarmStatus.NoAlarm)
                                                    {
                                                        monitorAlarm.Status = AlarmStatus.Suspicious;
                                                        monitorAlarm.Time = now;
                                                        isChanged = true;
                                                    }
                                                    else if (monitorAlarm.Status == AlarmStatus.Suspicious &&
                                                             now - monitorAlarm.Time > a.AlarmDelay)
                                                    {
                                                        monitorAlarm.Status = AlarmStatus.HasAlarm;
                                                        monitorAlarm.Time = now;
                                                        isChanged = true;
                                                    }
                                                }
                                            }
                                            else
                                            {
                                                if (monitorAlarm.Status != AlarmStatus.NoAlarm)
                                                {
                                                    monitorAlarm.Status = AlarmStatus.NoAlarm;
                                                    monitorAlarm.Time = now;
                                                    isChanged = true;
                                                }
                                                else
                                                {
                                                    var match = activeAlarms.FirstOrDefault(x => x.AlarmId == a.Id);
                                                    if (match != null)
                                                    {
                                                        monitorAlarm.Status = AlarmStatus.NoAlarm;
                                                        monitorAlarm.Time = now;
                                                        isChanged = true;
                                                    }
                                                }
                                            }

                                            if (isChanged)
                                            {
                                                if (monitorAlarm.Status == AlarmStatus.HasAlarm)
                                                {
                                                    alarmsTriggered++;
                                                    var activeAlarm =
                                                        activeAlarms.FirstOrDefault(x => x.AlarmId == a.Id);

                                                    if (activeAlarm == null)
                                                    {
                                                        activeAlarm = new ActiveAlarm()
                                                        {
                                                            AlarmId = a.Id,
                                                            ItemId = a.ItemId,
                                                            Time = now,
                                                        };
                                                        await _context.ActiveAlarms.AddAsync(activeAlarm);
                                                    }
                                                    else
                                                    {
                                                        activeAlarm.Time = now;
                                                    }

                                                    var alarmLog = JsonConvert.SerializeObject(a);

                                                    await _context.AlarmHistories.AddAsync(new AlarmHistory()
                                                    {
                                                        ItemId = a.ItemId,
                                                        AlarmId = a.Id,
                                                        Time = now,
                                                        IsActive = true,
                                                        AlarmLog = alarmLog,
                                                    });

                                                    await _context.SaveChangesAsync();

                                                    MyLog.Warning("Alarm triggered", new Dictionary<string, object?>
                                                    {
                                                        ["AlarmId"] = a.Id,
                                                        ["ItemId"] = a.ItemId,
                                                        ["AlarmType"] = a.AlarmType,
                                                        ["CompareType"] = a.CompareType
                                                    });

                                                    if (a.HasExternalAlarm.HasValue)
                                                    {
                                                        if (a.HasExternalAlarm.Value)
                                                        {
                                                            await HandleExternalAlarm(a, AlarmStatus.HasAlarm);
                                                        }
                                                    }
                                                }
                                                else if (monitorAlarm.Status == AlarmStatus.NoAlarm)
                                                {
                                                    alarmsCleared++;
                                                    var activeAlarm =
                                                        activeAlarms.FirstOrDefault(x => x.AlarmId == a.Id);
                                                    if (activeAlarm != null)
                                                    {
                                                        _context.ActiveAlarms.Remove(activeAlarm);

                                                        var alarmLog = JsonConvert.SerializeObject(a);

                                                        await _context.AlarmHistories.AddAsync(new AlarmHistory()
                                                        {
                                                            ItemId = a.ItemId,
                                                            AlarmId = a.Id,
                                                            Time = now,
                                                            IsActive = false,
                                                            AlarmLog = alarmLog,
                                                        });

                                                        await _context.SaveChangesAsync();

                                                        MyLog.Info("Alarm cleared", new Dictionary<string, object?>
                                                        {
                                                            ["AlarmId"] = a.Id,
                                                            ["ItemId"] = a.ItemId
                                                        });

                                                        if (a.HasExternalAlarm.HasValue)
                                                        {
                                                            if (a.HasExternalAlarm.Value)
                                                            {
                                                                await HandleExternalAlarm(a, AlarmStatus.NoAlarm);
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        catch (Exception ex1)
                                        {
                                            MyLog.Error("Error processing alarm", ex1, new Dictionary<string, object?>
                                            {
                                                ["AlarmId"] = a.Id,
                                                ["ItemId"] = a.ItemId,
                                                ["AlarmType"] = a.AlarmType
                                            });
                                        }
                                    }

                                    MyLog.Debug("Completed alarm check cycle", new Dictionary<string, object?>
                                    {
                                        ["AlarmsProcessed"] = alarmsProcessed,
                                        ["AlarmsTriggered"] = alarmsTriggered,
                                        ["AlarmsCleared"] = alarmsCleared
                                    });
                                }
                            }
                            catch (Exception ex2)
                            {
                                MyLog.Critical("Fatal error in alarm processing cycle", ex2, new Dictionary<string, object?>
                                {
                                    ["CorrelationId"] = correlationId
                                });
                            }
                            finally
                            {
                                await Task.Delay(1000); // Delay to prevent rapid loops
                            }
                        }
                    });
                }
            }

            await _runTask; // Await the task if it has already started
        }

        private async Task WaitForDatabaseConnection()
        {
            int maxRetries = 30;
            int retryDelay = 2000; // 2 seconds

            for (int i = 0; i < maxRetries; i++)
            {
                try
                {
                    using var testContext = new DataContext();
                    await testContext.Database.CanConnectAsync();
                    MyLog.LogJson("AlarmProcess", "Database connection established");
                    return;
                }
                catch (Exception ex)
                {
                    MyLog.LogJson("AlarmProcess", $"Waiting for database connection... Attempt {i + 1}/{maxRetries}");
                    if (i == maxRetries - 1)
                    {
                        MyLog.LogJson(ex);
                        throw;
                    }
                    await Task.Delay(retryDelay);
                }
            }
        }

    public async Task HandleExternalAlarm(Alarm alarm, AlarmStatus status)
    {
        try
        {
            MyLog.Debug("Handling external alarm", new Dictionary<string, object?>
            {
                ["AlarmId"] = alarm.Id,
                ["Status"] = status
            });

            if (_context == null)
            {
                _context = new DataContext();
            }

            long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

            var externalAlarms = await _context.ExternalAlarms.Where(x => x.AlarmId == alarm.Id).ToListAsync();

            MyLog.Debug("Found external alarms", new Dictionary<string, object?>
            {
                ["AlarmId"] = alarm.Id,
                ["ExternalAlarmCount"] = externalAlarms.Count
            });

            foreach (var ex in externalAlarms)
            {
                if (ex.IsDisabled)
                {
                    // no alarm
                    await Points.WriteValueAnyTrue(ex.ItemId, alarm.Id.ToString(), !ex.Value, now);
                }
                else
                {
                    if (status == AlarmStatus.HasAlarm)
                    {
                        await Points.WriteValueAnyTrue(ex.ItemId, alarm.Id.ToString(), ex.Value, now);
                    }
                    else if (status == AlarmStatus.NoAlarm)
                    {
                        await Points.WriteValueAnyTrue(ex.ItemId, alarm.Id.ToString(), !ex.Value, now);
                    }
                }
            }
        }
        catch (Exception e)
        {
            MyLog.Error("Failed to handle external alarm", e, new Dictionary<string, object?>
            {
                ["AlarmId"] = alarm.Id,
                ["Status"] = status
            });
        }
    }        // MonitorAlarm class
        public class MonitorAlarm
        {
            public Guid Id { get; set; }
            public long Time { get; set; }
            public AlarmStatus Status { get; set; }
        }

        // AlarmStatus enum
        public enum AlarmStatus
        {
            NoAlarm = 0,
            Suspicious = 1,
            HasAlarm = 2,
        }
    }
}