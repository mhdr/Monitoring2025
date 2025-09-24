namespace Share.Client.Dto;

public class GetJobTriggersResponseDto
{
    public List<Trigger> Triggers { get; set; } = [];

    public class Trigger
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string StartTime { get; set; }
        public string EndTime { get; set; }
        public bool IsDisabled { get; set; }
    }
}