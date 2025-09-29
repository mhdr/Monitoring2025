namespace API.Models.Dto;

public class GroupsResponseDto
{
    public List<Group> Groups { get; set; }

    public GroupsResponseDto()
    {
        Groups = new List<Group>();
    }

    public class Group
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string ParentId { get; set; }
    }
}