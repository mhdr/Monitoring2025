namespace API.Models.Dto;

public class GetPidControllersResponseDto
{
    public List<PidController> PidControllers { get; set; } = [];

    public class PidController
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
        public double DerivativeFilterAlpha { get; set; }
        public double MaxOutputSlewRate { get; set; }
        public double DeadZone { get; set; }
        public double FeedForward { get; set; }
    }
}