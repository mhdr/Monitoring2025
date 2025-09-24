namespace Share.Client.Dto;

public class GetJobDetailsResponseDto
{
    public List<JobDetail> Jobs { get; set; } = [];
    
    public class JobDetail
    {
        public Guid Id { get; set; }
        public Guid ItemId { get; set; }
        public string Value { get; set; }
    }
}