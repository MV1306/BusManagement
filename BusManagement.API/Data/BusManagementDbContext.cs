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
    public DbSet<StopTranslation> StopTranslations => Set<StopTranslation>();
    public DbSet<StageTranslation> StageTranslations => Set<StageTranslation>();
    public DbSet<RouteBusType> RouteBusTypes => Set<RouteBusType>();

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
        modelBuilder.Entity<StopTranslation>(e =>
        {
            e.HasKey(t => t.StopTranslationId);
            e.HasIndex(t => new { t.StopId, t.LanguageCode }).IsUnique();
            e.Property(t => t.LanguageCode).HasMaxLength(10).IsRequired();
            e.Property(t => t.TranslatedName).HasMaxLength(100).IsRequired();
            e.Property(t => t.TranslatedShortName).HasMaxLength(50);
            e.HasOne(t => t.Stop).WithMany(s => s.Translations).HasForeignKey(t => t.StopId);
        });

        modelBuilder.Entity<StageTranslation>(e =>
        {
            e.HasKey(t => t.StageTranslationId);
            e.HasIndex(t => new { t.RouteStageId, t.LanguageCode }).IsUnique();
            e.Property(t => t.LanguageCode).HasMaxLength(10).IsRequired();
            e.Property(t => t.TranslatedName).HasMaxLength(100).IsRequired();
            e.HasOne(t => t.RouteStage).WithMany(s => s.Translations).HasForeignKey(t => t.RouteStageId);
        });

        modelBuilder.Entity<RouteBusType>(e =>
        {
            e.HasKey(r => r.RouteBusTypeId);
            e.HasIndex(r => new { r.RouteId, r.BusType }).IsUnique();
            e.Property(r => r.BusType).HasConversion<string>().HasMaxLength(20);
            e.HasOne(r => r.Route).WithMany(rt => rt.RouteBusTypes).HasForeignKey(r => r.RouteId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
