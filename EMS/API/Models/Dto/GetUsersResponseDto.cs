namespace API.Models.Dto;

public class GetUsersResponseDto
{
    public List<User> Data { get; set; }

    public GetUsersResponseDto()
    {
        Data = new();
    }

    public class User
    {
        public Guid Id { get; set; }
        public string UserName { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public List<string> Roles { get; set; }
    }
}