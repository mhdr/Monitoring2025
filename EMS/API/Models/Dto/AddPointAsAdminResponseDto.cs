namespace API.Models.Dto;

public class AddPointAsAdminResponseDto
{
    public bool IsSuccessful { get; set; }
    public AddPointErrorType? Error { get; set; }

    public enum AddPointErrorType
    {
        UnKnown = 0,
        DuplicatePointNumber = 1,
    }
}