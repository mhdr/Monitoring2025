namespace Core.RedisModels;

public class FinalItemRedis
{
    public Guid ItemId { get; set; }

    public string Value { get; set; } = string.Empty;
    public long Time { get; set; }
}