namespace API.Models.Dto;

public class EditUserResponseDto
{
    public bool IsSuccessful { get; set; }
    public EditUserErrorType? Error { get; set; }

    public enum EditUserErrorType
    {
        DuplicateUserName = 1,
        EmptyUserName=2,
    }
}