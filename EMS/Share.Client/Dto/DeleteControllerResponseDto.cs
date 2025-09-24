namespace Share.Client.Dto;

public class DeleteControllerResponseDto
{
    public bool IsSuccessful { get; set; }
    public ErrorType? Error { get; set; }

    public enum ErrorType
    {
        AlreadyInUse = 1,
    }
}