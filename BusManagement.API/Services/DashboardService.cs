using BusManagement.API.Data;
using BusManagement.API.DTOs.DashboardDTOs;
using Microsoft.EntityFrameworkCore;

namespace BusManagement.API.Services;

public class DashboardService(BusManagementDbContext db)
{
    public async Task<DashboardSummary> GetSummaryAsync()
    {
        var totalStops   = await db.Stops.CountAsync();
        var activeStops  = await db.Stops.CountAsync(s => s.IsActive);
        var totalRoutes  = await db.Routes.CountAsync();
        var activeRoutes = await db.Routes.CountAsync(r => r.IsActive);
        var totalFares   = await db.Fares.CountAsync();
        var routesWithNoStops  = await db.Routes.CountAsync(r => !r.RouteStops.Any());
        var stopsWithNoCoords  = await db.Stops.CountAsync(s => s.Latitude == null || s.Longitude == null);
        var lastImported = await db.Stops
            .OrderByDescending(s => s.CreatedDate)
            .Select(s => (DateTime?)s.CreatedDate)
            .FirstOrDefaultAsync();

        var recentRoutes = await db.Routes
            .OrderByDescending(r => r.CreatedDate)
            .Take(10)
            .Select(r => new RecentRoute(
                r.RouteId, r.RouteCode, r.RouteName,
                r.RouteStops.Select(rs => rs.StopId).Distinct().Count(),
                r.RouteStops.Sum(rs => (double?)rs.DistanceFromPreviousKm) ?? 0,
                r.RouteBusTypes.Select(bt => bt.BusType.ToString()).ToList(),
                r.CreatedDate, r.IsActive))
            .ToListAsync();

        var topRoutes = await db.Routes
            .Where(r => r.RouteStops.Any())
            .OrderByDescending(r => r.RouteStops.Select(rs => rs.StopId).Distinct().Count())
            .Take(5)
            .Select(r => new TopRoute(
                r.RouteId, r.RouteCode, r.RouteName,
                r.RouteStops.Select(rs => rs.StopId).Distinct().Count(),
                r.RouteStops.Sum(rs => (double?)rs.DistanceFromPreviousKm) ?? 0))
            .ToListAsync();

        var cutoff = DateTime.UtcNow.Date.AddDays(-6);
        var rawCounts = await db.Stops
            .Where(s => s.CreatedDate >= cutoff)
            .GroupBy(s => s.CreatedDate.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync();

        var stopsLast7 = Enumerable.Range(0, 7)
            .Select(i => DateTime.UtcNow.Date.AddDays(-6 + i))
            .Select(d => new DailyCount(
                d.ToString("MMM d"),
                rawCounts.FirstOrDefault(x => x.Date == d)?.Count ?? 0))
            .ToList();

        return new DashboardSummary(
            totalStops, activeStops, totalStops - activeStops,
            totalRoutes, activeRoutes, totalRoutes - activeRoutes,
            totalFares, routesWithNoStops, stopsWithNoCoords,
            lastImported, recentRoutes, topRoutes, stopsLast7);
    }
}
