namespace Share.Client.Dto;

public class GetRolesResponseDto
{
    public List<Role> Data { get; set; } = [];

    public class Role
    {
        public Guid Id { get; set; }
        public string RoleName { get; set; }
    }
}