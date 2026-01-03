namespace API.Models.Dto;

public class GetSvgLayoutResponseDto
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public string Content { get; set; } = String.Empty;
    public List<Point> Points { get; set; } = [];
    public required string FontSize { get; set; }
    
    public class Point
    {
        public Guid ItemId { get; set; }
        public int X { get; set; }
        public int Y { get; set; }
        public required string BoxColor { get; set; }
        public double BoxOpacity { get; set; }
    }
}