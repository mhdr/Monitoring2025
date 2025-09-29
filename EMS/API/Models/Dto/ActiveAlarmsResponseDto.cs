namespace API.Models.Dto;

public class ActiveAlarmsResponseDto
{
    public List<ActiveAlarm> Data { get; set; }

    public ActiveAlarmsResponseDto()
    {
        Data = new();
    }

    public class ActiveAlarm
    {
        public string Id { get; set; }
        public string AlarmId { get; set; }
        public string ItemId { get; set; }
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