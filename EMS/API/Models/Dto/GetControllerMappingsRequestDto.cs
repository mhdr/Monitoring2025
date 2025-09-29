using Share.Libs;

namespace API.Models.Dto;

public class GetControllerMappingsRequestDto
{
    public ControllerType ControllerType { get; set; }
    public IoOperationType OperationType { get; set; }
    public Guid? ControllerId { get; set; }
}