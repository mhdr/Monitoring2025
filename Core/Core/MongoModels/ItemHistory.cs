using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.MongoModels;

public class ItemHistoryMongo
{
    public Guid Id { get; set; }

    public Guid ItemId { get; set; }
    public string Value { get; set; } = string.Empty;
    public long Time { get; set; }
}