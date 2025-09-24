namespace Share.Client.Dto;

public class AlarmsRequestDto
{
    public List<string> ItemIds { get; set; }

    public AlarmsRequestDto()
    {
        ItemIds = new();
    }
}