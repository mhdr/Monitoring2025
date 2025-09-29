namespace API.Models.Dto;

public class EditPointAsAdminResponseDto
{
    public bool IsSuccessful { get; set; }
    public ErrorType? Error { get; set; }

    public enum ErrorType
    {
        UnKnown = 0,
        DuplicatePointNumber = 1,
    }
}