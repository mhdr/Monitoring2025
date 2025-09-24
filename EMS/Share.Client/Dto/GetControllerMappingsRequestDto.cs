using Share.Client.Libs;

namespace Share.Client.Dto;

public class GetControllerMappingsRequestDto
{
    public ControllerType ControllerType { get; set; }
    public IoOperationType OperationType { get; set; }
    public Guid? ControllerId { get; set; }
}