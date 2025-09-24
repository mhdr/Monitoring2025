namespace Share.Client.Dto;

public class AuditLogRequestDto
{
    public string? ItemId { get; set; }
    public long StartDate { get; set; }
    public long EndDate { get; set; }
}