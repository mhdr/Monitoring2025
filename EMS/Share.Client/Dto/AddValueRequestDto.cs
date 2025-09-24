namespace Share.Client.Dto;

public class AddValueRequestDto
{
    public Guid ItemId { get; set; }
    public string Value { get; set; }
    public long Time { get; set; }
}