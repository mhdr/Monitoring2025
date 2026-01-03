namespace API.Models.Dto;

public class LoginResponseDto
{
    public required string UserName { get; set; }
    public required string UserId { get; set; }
    public IList<string>? Roles { get; set; } = [];
}