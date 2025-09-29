using Share.Libs;

namespace API.Models.Dto;

public class GetControllerMappingsResponseDto
{
    public List<Mapping>? Mappings { get; set; }

    public class Mapping
    {
        public Guid Id { get; set; }
        public Guid ControllerId { get; set; }
        public Guid ItemId { get; set; }
        public int Position { get; set; }
        public int? Bit { get; set; }
        public IoOperationType OperationType { get; set; }
    }
}