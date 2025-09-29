using System.Net;

namespace API.Models.Dto;

public class LogoutResponseDto
{
    public bool LoggedIn { get; set; }
    public string? UserName { get; set; }
    public string? UserId { get; set; }
}