using Share.Libs;

namespace API.Models.Dto;

public class EditPointRequestDto
{
    public Guid Id { get; set; }
    public ItemType ItemType { get; set; }
    public string? ItemName { get; set; }
   public string? OnText { get; set; }

   public string? OffText { get; set; }

    public string? Unit { get; set; }
}