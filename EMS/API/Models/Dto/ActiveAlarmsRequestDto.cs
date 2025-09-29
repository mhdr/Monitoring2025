namespace API.Models.Dto;

public class ActiveAlarmsRequestDto
{
    public List<string> ItemIds { get; set; }

    public ActiveAlarmsRequestDto()
    {
        ItemIds = new();
    }
}