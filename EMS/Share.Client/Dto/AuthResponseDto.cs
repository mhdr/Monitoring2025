namespace Share.Client.Dto;

public class AuthResponseDto
{
    public bool LoggedIn { get; set; }
    public string? UserName { get; set; }
    public string? UserId { get; set; }
}