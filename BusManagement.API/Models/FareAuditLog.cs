namespace BusManagement.API.Models;

public class FareAuditLog
{
    public int AuditId { get; set; }
    public int FareId { get; set; }
    public BusType BusType { get; set; }
    public int Stages { get; set; }
    public decimal? OldAmount { get; set; }
    public decimal? NewAmount { get; set; }
    public string Action { get; set; } = null!; // Created | Updated | Deleted
    public string? ChangedBy { get; set; }
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
}
