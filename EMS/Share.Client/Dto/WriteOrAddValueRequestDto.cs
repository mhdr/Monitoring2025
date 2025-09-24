namespace Share.Client.Dto;

public class WriteOrAddValueRequestDto
{
    public Guid ItemId { get; set; }
    public string Value { get; set; }
    public long? Time { get; set; }
}