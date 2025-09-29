namespace API.Models.Dto;

public class EditPointAsAdminResponseDto
{
    public bool IsSuccessful { get; set; }
    public EditPointErrorType? Error { get; set; }

    public enum EditPointErrorType
    {
        UnKnown = 0,
        DuplicatePointNumber = 1,
    }
}