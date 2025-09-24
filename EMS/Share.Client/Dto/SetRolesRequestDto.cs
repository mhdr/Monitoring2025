namespace Share.Client.Dto;

public class SetRolesRequestDto
{
    public Guid UserId { get; set; }
    public string UserName { get; set; }
    public List<string> Roles { get; set; }
}