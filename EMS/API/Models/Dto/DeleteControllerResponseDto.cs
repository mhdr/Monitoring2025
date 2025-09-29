namespace API.Models.Dto;

public class DeleteControllerResponseDto
{
    public bool IsSuccessful { get; set; }
    public DeleteControllerErrorType? Error { get; set; }

    public enum DeleteControllerErrorType
    {
        AlreadyInUse = 1,
    }
}