namespace API.Models.Dto;

public class MoveGroupRequestDto
{
    public Guid GroupId { get; set; }
    public Guid? ParentId { get; set; }
}