

using Share.Client.Libs;

namespace Share.Client.Dto;

public class AuditLogResponseDto
{
    public List<DataDto> Data { get; set; }

    public AuditLogResponseDto()
    {
        Data = new();
    }

    public class DataDto
    {
        public Guid Id { get; set; }
        public bool IsUser { get; set; }
        public Guid? UserId { get; set; }
        public string? UserName { get; set; }
        public Guid? ItemId { get; set; }
        public LogType ActionType { get; set; }
        public string? IpAddress { get; set; }
        public string? LogValue { get; set; }
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