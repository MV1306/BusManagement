namespace BusManagement.API.Models;

public class Stop
{
    public int StopId { get; set; }
    public string StopCode { get; set; } = null!;
    public string StopName { get; set; } = null!;
    public string? ShortName { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public bool IsActive { get; set; } = true;
    public string? CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public string? ModifiedBy { get; set; }
    public DateTime? ModifiedDate { get; set; }

    public ICollection<RouteStop> RouteStops { get; set; } = [];
}
