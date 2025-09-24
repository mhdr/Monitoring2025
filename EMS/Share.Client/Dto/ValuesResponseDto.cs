namespace Share.Client.Dto;

public class ValuesResponseDto
{
    public List<Value2> Values { get; set; }

    public ValuesResponseDto()
    {
        Values = new();
    }

    public class Value2
    {
        public string ItemId { get; set; }
        public string Value { get; set; }
        public long Time { get; set; }

        public DateTime DateTime
        {
            get
            {
                DateTimeOffset dateTimeOffset = DateTimeOffset.FromUnixTimeSeconds(Time);
                DateTime localDateTime = dateTimeOffset.LocalDateTime;
                return localDateTime;
            }
        }
    }
}