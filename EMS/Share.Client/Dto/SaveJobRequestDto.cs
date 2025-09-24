namespace Share.Client.Dto;

public class SaveJobRequestDto
{
    public Guid? TriggerId { get; set; }
    public string TriggerName { get; set; }
    public bool IsDisabled { get; set; }
    public string StartTime { get; set; }
    public string EndTime { get; set; }

    public List<JobDetail> Changed { get; set; } = [];
    public List<JobDetail> Added { get; set; } = [];
    public List<JobDetail> Removed { get; set; } = [];

    public class JobDetail
    {
        public Guid Id { get; set; }
        public Guid ItemId { get; set; }
        public string Value { get; set; }
    }
}