namespace Share.Client.Dto;

public class AddControllerRequestDto
{
    public string Name { get; set; }
    public string IPAddress { get; set; }
    public int DBAddress { get; set; }
    public int DBStartData { get; set; }
    public int DBSizeData { get; set; }
    public int DataType { get; set; }
    public int ControllerType { get; set; }
}