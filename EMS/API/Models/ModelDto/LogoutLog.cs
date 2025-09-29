namespace API.Models.ModelDto;

public class LogoutLog
{
    public bool IsSuccessful { get; set; }
    public string? UserName { get; set; }
    public string? Error { get; set; }
}