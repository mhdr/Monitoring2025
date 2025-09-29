namespace API.Models.Dto;

public class LoginResponseDto
{
    public string UserName { get; set; }
    public string UserId { get; set; }
    public IList<string>? Roles { get; set; } = [];
}