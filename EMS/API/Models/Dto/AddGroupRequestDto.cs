namespace API.Models.Dto;

public class AddGroupRequestDto
{
    public string Name { get; set; }
    public Guid? ParentId { get; set; }
}