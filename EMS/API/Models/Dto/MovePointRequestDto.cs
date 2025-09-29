namespace API.Models.Dto;

public class MovePointRequestDto
{
    public Guid PointId { get; set; }
    public Guid ParentId { get; set; }
}