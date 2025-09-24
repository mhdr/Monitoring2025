namespace Share.Client.Dto;

public class SavePermissionsRequestDto
{
    public string UserId { get; set; }
    public List<string> GroupPermissions { get; set; }
    public List<string> ItemPermissions { get; set; }

    public SavePermissionsRequestDto()
    {
        GroupPermissions = new();
        ItemPermissions = new();
    }
}