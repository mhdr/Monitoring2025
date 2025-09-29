namespace API.Models.Dto;

public class AlarmHistoryRequestDto
{
    public List<string>? ItemIds { get; set; }
    public long StartDate { get; set; }
    public long EndDate { get; set; }

    public AlarmHistoryRequestDto()
    {
        ItemIds = new();
    }
}