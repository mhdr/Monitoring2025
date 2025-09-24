using Share.Client.Libs;

namespace Share.Client.Dto;

public class BatchEditMappingsRequestDto
{
    public Guid ControllerId { get; set; }
    public IoOperationType OperationType { get; set; }
    public List<Map> Changed { get; set; } = [];
    public List<Map> Added { get; set; } = [];
    public List<Map> Removed { get; set; } = [];

    public class Map
    {
        public Guid Id { get; set; }
        public Guid ControllerId { get; set; }
        public int Position { get; set; }
        public int? Bit { get; set; }
        public Guid ItemId { get; set; }
    }
}