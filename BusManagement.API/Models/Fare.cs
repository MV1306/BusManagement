namespace BusManagement.API.Models;

public class Fare
{
    public int FareId { get; set; }
    public BusType BusType { get; set; }
    public int Stages { get; set; }
    public decimal FareAmount { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
}
