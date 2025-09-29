using Share.Libs;

namespace Share.Client.Dto;

public class GetControllersResponseDto
{
    public List<Controller> Data { get; set; } = [];

    public class Controller
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string IPAddress { get; set; }
        public int DBAddress { get; set; }
        public int DBStartData { get; set; }
        public int DBSizeData { get; set; }
        public DataType DataType { get; set; }
        public ControllerType ControllerType { get; set; }
        
        public bool IsDisabled { get; set; }
    }
}