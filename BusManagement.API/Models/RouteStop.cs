namespace BusManagement.API.Models;

public class RouteStop
{
    public int RouteStopId { get; set; }
    public int RouteId { get; set; }
    public int StopId { get; set; }
    public int RouteStageId { get; set; }
    public int StopOrder { get; set; }
    public double DistanceFromPreviousKm { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    public Route Route { get; set; } = null!;
    public Stop Stop { get; set; } = null!;
    public RouteStage RouteStage { get; set; } = null!;
}
