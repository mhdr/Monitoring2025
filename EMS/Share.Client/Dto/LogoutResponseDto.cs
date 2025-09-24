using System.Net;

namespace Share.Client.Dto;

public class LogoutResponseDto
{
    public bool LoggedIn { get; set; }
    public string? UserName { get; set; }
    public string? UserId { get; set; }
}