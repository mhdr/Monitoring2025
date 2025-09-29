namespace API.Models.Dto;

public class ValuesRequestDto
{
    public List<string> ItemIds { get; set; }

    public ValuesRequestDto()
    {
        ItemIds = new();
    }
}