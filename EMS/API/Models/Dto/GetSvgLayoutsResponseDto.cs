namespace API.Models.Dto;

public class GetSvgLayoutsResponseDto
{
    public bool IsSuccess { get; set; }
    public List<Layout> Layouts { get; set; } = [];
    
    public class Layout
    {
        public Guid Id { get; set; }
        public string? Name { get; set; }
        public string Content { get; set; } = String.Empty;
    }
}