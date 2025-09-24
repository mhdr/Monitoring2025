namespace Share.Client.Dto;

public class HistoryRequestDto
{
    public string ItemId { get; set; }
    public long StartDate { get; set; }
    public long EndDate { get; set; }
}