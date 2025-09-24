namespace Share.Client.Dto;

public class EditPidSetPointRequestDto
{
    public Guid PidControllerId { get; set; }
    public double SetPoint { get; set; }
}