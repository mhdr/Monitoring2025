namespace Share.Client.Dto;

public class AlarmHistoryResponseDto
{
    public List<AlarmHistory> Data { get; set; }

    public AlarmHistoryResponseDto()
    {
        Data = new();
    }

    public class AlarmHistory
    {
        public string Id { get; set; }
        public string AlarmId { get; set; }
        public string ItemId { get; set; }
        public long Time { get; set; }
        public bool IsActive { get; set; }
        public string? AlarmLog { get; set; }

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