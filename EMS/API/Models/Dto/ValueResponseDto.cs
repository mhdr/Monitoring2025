namespace API.Models.Dto;

public class ValueResponseDto
{
    public Value2 Value { get; set; }
    

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