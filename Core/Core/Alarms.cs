using System.Linq.Expressions;
using Core.Libs;
using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Core;

public static class Alarms
{
    public static async Task<Guid> AddAlarm(Alarm alarm)
    {
        try
        {
            var context = new DataContext();

            var found = await context.Alarms.AnyAsync(x => x.Id == alarm.Id);

            if (found)
            {
                await context.DisposeAsync();
                return Guid.Empty;
            }

            if (string.IsNullOrEmpty(alarm.Message))
            {
                if (alarm.AlarmType == AlarmType.Timeout)
                {
                    alarm.Message = "Read timeout";
                    if (string.IsNullOrEmpty(alarm.MessageFa))
                    {
                        alarm.MessageFa = "وقفه در خواندن";
                    }
                }
                else if (alarm.AlarmType == AlarmType.Comparative)
                {
                    var item = await context.MonitoringItems.FirstOrDefaultAsync(x => x.Id == alarm.ItemId);

                    if (item != null)
                    {
                        if (item.ItemType == ItemType.AnalogInput || item.ItemType == ItemType.AnalogOutput)
                        {
                            if (alarm.CompareType == CompareType.Equal)
                            {
                                alarm.Message = $"{item.ItemName} is equal to {alarm.Value1}";
                                if (string.IsNullOrEmpty(alarm.MessageFa))
                                {
                                    alarm.MessageFa = $"{item.ItemNameFa} برابر است با {alarm.Value1}";
                                }
                            }
                            else if (alarm.CompareType == CompareType.NotEqual)
                            {
                                alarm.Message = $"{item.ItemName} is not equal to {alarm.Value1}";
                                if (string.IsNullOrEmpty(alarm.MessageFa))
                                {
                                    alarm.MessageFa = $"{item.ItemNameFa} برابر نیست با {alarm.Value1}";
                                }
                            }
                            else if (alarm.CompareType == CompareType.Higher)
                            {
                                alarm.Message = $"{item.ItemName} is higher than {alarm.Value1}";
                                if (string.IsNullOrEmpty(alarm.MessageFa))
                                {
                                    alarm.MessageFa = $"{item.ItemNameFa} بیشتر است از {alarm.Value1}";
                                }
                            }
                            else if (alarm.CompareType == CompareType.Lower)
                            {
                                alarm.Message = $"{item.ItemName} is lower than {alarm.Value1}";
                                if (string.IsNullOrEmpty(alarm.MessageFa))
                                {
                                    alarm.MessageFa = $"{item.ItemNameFa} کمتر است از {alarm.Value1}";
                                }
                            }
                            else if (alarm.CompareType == CompareType.Between)
                            {
                                alarm.Message = $"{item.ItemName} is between {alarm.Value1} and {alarm.Value2}";
                                if (string.IsNullOrEmpty(alarm.MessageFa))
                                {
                                    alarm.MessageFa = $"{item.ItemNameFa} بین {alarm.Value1} و {alarm.Value2} است";
                                }
                            }
                        }
                        else if (item.ItemType == ItemType.DigitalInput || item.ItemType == ItemType.DigitalOutput)
                        {
                            if (alarm.CompareType == CompareType.Equal)
                            {
                                var text = "";
                                var textFa = "";

                                if (alarm.Value1 == "1")
                                {
                                    text = item.OnText;
                                    textFa = item.OnTextFa;
                                }
                                else if (alarm.Value1 == "0")
                                {
                                    text = item.OffText;
                                    textFa = item.OffTextFa;
                                }

                                alarm.Message = $"{item.ItemName} is {text}";
                                if (string.IsNullOrEmpty(alarm.MessageFa))
                                {
                                    alarm.MessageFa = $"{item.ItemNameFa} {textFa} است";
                                }
                            }
                            else if (alarm.CompareType == CompareType.NotEqual)
                            {
                                var text = "";
                                var textFa = "";

                                if (alarm.Value1 == "1")
                                {
                                    text = item.OnText;
                                    textFa = item.OnTextFa;
                                }
                                else if (alarm.Value1 == "0")
                                {
                                    text = item.OffText;
                                    textFa = item.OffTextFa;
                                }

                                alarm.Message = $"{item.ItemName} is not {text}";
                                if (string.IsNullOrEmpty(alarm.MessageFa))
                                {
                                    alarm.MessageFa = $"{item.ItemNameFa} {textFa} نیست";
                                }
                            }
                        }
                    }
                }
            }

            context.Alarms.Add(alarm);

            await context.SaveChangesAsync();
            var id = alarm.Id;
            await context.DisposeAsync();
            return id;
        }
        catch (Exception e)
        {
            MyLog.LogJson(e);
            return Guid.Empty;
        }
    }

    public static async Task<List<Alarm>> ListAlarms(List<string> itemIds)
    {
        var result = new List<Alarm>();
        var context = new DataContext();

        var alarms = await context.Alarms.ToListAsync();


        foreach (var a in alarms)
        {
            if (itemIds.Contains(a.ItemId.ToString()))
            {
                result.Add(a);
            }
        }

        // await context.SaveChangesAsync();
        await context.DisposeAsync();

        return result;
    }

    public static async Task<Alarm?> GetAlarm(Guid alarmId)
    {
        var context = new DataContext();
        var alarm = await context.Alarms.FirstOrDefaultAsync(x => x.Id == alarmId);
        await context.DisposeAsync();
        return alarm;
    }

    public static async Task<List<ActiveAlarm>> ActiveAlarms(List<string>? itemIds = null)
    {
        var result = new List<ActiveAlarm>();
        var context = new DataContext();

        var alarms = await context.Alarms.ToListAsync();
        var activeAlarms = await context.ActiveAlarms
            .OrderBy(x => x.Time)
            .ToListAsync();

        foreach (var a in activeAlarms)
        {
            var alarm = alarms.FirstOrDefault(x => x.Id == a.AlarmId);

            if (alarm != null)
            {
                if (itemIds != null)
                {
                    if (itemIds.Contains(alarm.ItemId.ToString()))
                    {
                        result.Add(a);
                    }
                }
                else
                {
                    result.Add(a);
                }
            }
        }

        await context.DisposeAsync();

        return result;
    }

    public static async Task<List<AlarmHistory>> HistoryAlarms(long startDate, long endDate,
        List<string>? itemIds = null)
    {
        var result = new List<AlarmHistory>();
        var context = new DataContext();

        var alarmHistory = await context.AlarmHistories
            .Where(x => x.Time >= startDate && x.Time <= endDate)
            .OrderByDescending(x => x.Time)
            .ToListAsync();

        foreach (AlarmHistory h in alarmHistory)
        {
            if (itemIds != null)
            {
                if (itemIds.Contains(h.ItemId.ToString()))
                {
                    result.Add(h);
                }
            }
            else
            {
                result.Add(h);
            }
        }

        await context.DisposeAsync();

        return result;
    }

    public static async Task<bool> EditAlarm(Alarm alarm)
    {
        try
        {
            var context = new DataContext();
            context.Alarms.Update(alarm);
            await context.SaveChangesAsync();
            await context.DisposeAsync();
            return true;
        }
        catch (Exception)
        {
            return false;
        }
    }

    public static async Task<bool> DeleteAlarm(Expression<Func<Alarm, bool>> predicate)
    {
        var context = new DataContext();
        var alarm = await context.Alarms.FirstOrDefaultAsync(predicate);

        if (alarm == null)
        {
            await context.DisposeAsync();
            return false;
        }

        alarm.IsDeleted = true;
        alarm.IsDisabled = true;
        context.Alarms.Update(alarm);
        await context.SaveChangesAsync();
        await context.DisposeAsync();
        return true;
    }

    public static async Task<List<ExternalAlarm>> GetExternalAlarms(Expression<Func<ExternalAlarm, bool>> predicate)
    {
        var context = new DataContext();
        var alarms = await context.ExternalAlarms.Where(predicate).ToListAsync();
        await context.DisposeAsync();
        return alarms;
    }

    public static async Task<bool> AddExternalAlarm(ExternalAlarm externalAlarm)
    {
        try
        {
            var context = new DataContext();
            await context.ExternalAlarms.AddAsync(externalAlarm);
            await context.SaveChangesAsync();
            await context.DisposeAsync();
            return true;
        }
        catch (Exception e)
        {
            MyLog.LogJson(e);
            return false;
        }
    }

    public static async Task<bool> UpdateExternalAlarm(ExternalAlarm externalAlarm)
    {
        try
        {
            var context = new DataContext();
            context.ExternalAlarms.Update(externalAlarm);
            await context.SaveChangesAsync();
            await context.DisposeAsync();
            return true;
        }
        catch (Exception e)
        {
            MyLog.LogJson(e);
            return false;
        }
    }

    public static async Task<bool> RemoveExternalAlarm(ExternalAlarm externalAlarm)
    {
        try
        {
            var context = new DataContext();
            context.ExternalAlarms.Remove(externalAlarm);
            await context.SaveChangesAsync();
            await context.DisposeAsync();
            return true;
        }
        catch (Exception e)
        {
            MyLog.LogJson(e);
            return false;
        }
    }

    public static async Task<bool> BatchEditExternalAlarms(List<ExternalAlarm> added, List<ExternalAlarm> updated,
        List<ExternalAlarm> removed)
    {
        await using (var context = new DataContext())
        {
            await using (var transaction = await context.Database.BeginTransactionAsync())
            {
                try
                {
                    await context.ExternalAlarms.AddRangeAsync(added);
                    context.ExternalAlarms.UpdateRange(updated);
                    context.ExternalAlarms.RemoveRange(removed);

                    await context.SaveChangesAsync();
                    // Commit transaction
                    await transaction.CommitAsync();
                    return true;
                }
                catch (Exception ex)
                {
                    // Rollback transaction
                    await transaction.RollbackAsync();
                    MyLog.LogJson(ex);
                }
            }
        }

        return false;
    }
}