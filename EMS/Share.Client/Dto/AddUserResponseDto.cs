namespace Share.Client.Dto;

public class AddUserResponseDto
{
    public bool IsSuccessful { get; set; }
    public ErrorType? Error { get; set; }

    public enum ErrorType
    {
        DuplicateUserName = 1,
        EmptyUserName=2,
    }
}