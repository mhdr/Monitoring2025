using Core.Models;
using Core.RedisModels;

namespace Core.Libs;

public class MonitoringValue
{
    public Guid ItemId { get; set; }
    public string Value { get; set; } = string.Empty;
    public long Time { get; set; }

    public MonitoringValue()
    {
    }

    public MonitoringValue(RawItemRedis rawItem)
    {
        ItemId = rawItem.ItemId;
        Value = rawItem.Value;
        Time = rawItem.Time;
    }
}