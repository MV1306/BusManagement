using BusManagement.API.Models;
using Microsoft.EntityFrameworkCore;

namespace BusManagement.API.Data;

public class BusManagementDbContext(DbContextOptions<BusManagementDbContext> options) : DbContext(options)
{
    public DbSet<Stop> Stops => Set<Stop>();
    public DbSet<Models.Route> Routes => Set<Models.Route>();
    public DbSet<RouteStage> RouteStages => Set<RouteStage>();
    public DbSet<RouteStop> RouteStops => Set<RouteStop>();
    public DbSet<Fare> Fares => Set<Fare>();
    public DbSet<FareAuditLog> FareAuditLogs => Set<FareAuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Stop>(e =>
        {
            e.HasKey(s => s.StopId);
            e.HasIndex(s => s.StopCode).IsUnique();
            e.Property(s => s.StopCode).HasMaxLength(20).IsRequired();
            e.Property(s => s.StopName).HasMaxLength(100).IsRequired();
            e.Property(s => s.ShortName).HasMaxLength(50);
        });

        modelBuilder.Entity<Models.Route>(e =>
        {
            e.HasKey(r => r.RouteId);
            e.HasIndex(r => r.RouteCode).IsUnique();
            e.Property(r => r.RouteCode).HasMaxLength(20).IsRequired();
            e.Property(r => r.RouteName).HasMaxLength(100).IsRequired();
        });

        modelBuilder.Entity<RouteStage>(e =>
        {
            e.HasKey(rs => rs.RouteStageId);
            e.HasIndex(rs => new { rs.RouteId, rs.StageOrder }).IsUnique();
            e.Property(rs => rs.StageName).HasMaxLength(100).IsRequired();
            e.HasOne(rs => rs.Route).WithMany(r => r.RouteStages).HasForeignKey(rs => rs.RouteId);
        });

        modelBuilder.Entity<RouteStop>(e =>
        {
            e.HasKey(rs => rs.RouteStopId);
            e.HasIndex(rs => new { rs.RouteId, rs.StopOrder }).IsUnique();
            e.HasOne(rs => rs.Route).WithMany(r => r.RouteStops).HasForeignKey(rs => rs.RouteId);
            e.HasOne(rs => rs.Stop).WithMany(s => s.RouteStops).HasForeignKey(rs => rs.StopId);
            e.HasOne(rs => rs.RouteStage).WithMany(s => s.RouteStops).HasForeignKey(rs => rs.RouteStageId);
        });

        modelBuilder.Entity<Fare>(e =>
        {
            e.HasKey(f => f.FareId);
            e.HasIndex(f => new { f.BusType, f.Stages }).IsUnique();
            e.Property(f => f.BusType).HasConversion<string>().HasMaxLength(20);
            e.Property(f => f.FareAmount).HasPrecision(10, 2);
        });

        modelBuilder.Entity<FareAuditLog>(e =>
        {
            e.HasKey(a => a.AuditId);
            e.Property(a => a.BusType).HasConversion<string>().HasMaxLength(20);
            e.Property(a => a.OldAmount).HasPrecision(10, 2);
            e.Property(a => a.NewAmount).HasPrecision(10, 2);
            e.Property(a => a.Action).HasMaxLength(10);
            e.Property(a => a.ChangedBy).HasMaxLength(100);
        });
    }
}
