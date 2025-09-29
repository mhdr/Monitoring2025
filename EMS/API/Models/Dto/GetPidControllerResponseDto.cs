namespace API.Models.Dto;

public class GetPidControllerResponseDto
{
    public Guid Id { get; set; }
    public Guid InputItemId { get; set; }
    public Guid OutputItemId { get; set; }
    public double Kp { get; set; }
    public double Ki { get; set; }
    public double Kd { get; set; }
    public double OutputMin { get; set; }
    public double OutputMax { get; set; }
    public int Interval { get; set; }
    public bool IsDisabled { get; set; }
    public double? SetPoint { get; set; }
    public double DerivativeFilterAlpha { get; set; }
    public double MaxOutputSlewRate { get; set; }
    public double DeadZone { get; set; }
    public double FeedForward { get; set; }
    public bool IsAuto { get; set; }
    public double? ManualValue { get; set; }
}