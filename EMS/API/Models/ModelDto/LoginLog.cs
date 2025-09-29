namespace API.Models.ModelDto;

public class LoginLog
{
    public bool IsSuccessful { get; set; }
    public string? UserName { get; set; }
    public string? Error { get; set; }
}