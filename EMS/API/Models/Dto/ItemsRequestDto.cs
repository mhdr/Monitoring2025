namespace API.Models.Dto;

public class ItemsRequestDto
{
    public string? UserId { get; set; }
    public bool ShowOrphans { get; set; } = false;
}