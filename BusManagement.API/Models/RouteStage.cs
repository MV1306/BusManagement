namespace BusManagement.API.Models;

public class RouteStage
{
    public int RouteStageId { get; set; }
    public int RouteId { get; set; }
    public string StageName { get; set; } = null!;
    public int StageOrder { get; set; }
    public double? DistanceFromPreviousKm { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    public Route Route { get; set; } = null!;
    public ICollection<RouteStop> RouteStops { get; set; } = [];
    public ICollection<StageTranslation> Translations { get; set; } = [];
}
