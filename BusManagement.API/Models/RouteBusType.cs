namespace BusManagement.API.Models;

public class RouteBusType
{
    public int RouteBusTypeId { get; set; }
    public int RouteId { get; set; }
    public BusType BusType { get; set; }

    public Route Route { get; set; } = null!;
}
