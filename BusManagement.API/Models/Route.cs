namespace BusManagement.API.Models;

public class Route
{
    public int RouteId { get; set; }
    public string RouteCode { get; set; } = null!;
    public string RouteName { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    public string? CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public string? ModifiedBy { get; set; }
    public DateTime? ModifiedDate { get; set; }

    public ICollection<RouteStage> RouteStages { get; set; } = [];
    public ICollection<RouteStop> RouteStops { get; set; } = [];
    public ICollection<RouteBusType> RouteBusTypes { get; set; } = [];
}
