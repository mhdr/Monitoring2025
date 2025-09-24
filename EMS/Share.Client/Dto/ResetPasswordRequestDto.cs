namespace Share.Client.Dto;

public class ResetPasswordRequestDto
{
    public Guid UserId { get; set; }
    public string UserName { get; set; }
}