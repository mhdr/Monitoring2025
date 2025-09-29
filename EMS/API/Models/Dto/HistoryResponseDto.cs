namespace API.Models.Dto;

public class HistoryResponseDto
{
    public List<Data> Values { get; set; }

    public HistoryResponseDto()
    {
        Values = new();
    }

    public class Data
    {
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