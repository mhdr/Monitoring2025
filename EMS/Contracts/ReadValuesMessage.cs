namespace Contracts;

public class ReadValuesMessage
{
    public ReadValuesMessage()
    {
        Values = [];
    }
    
    public List<ReadValue> Values { get; set; }
    
    public class ReadValue
    {
        public Guid ItemId { get; set; }

        public string Value { get; set; }
        public long Time { get; set; }
    }
}