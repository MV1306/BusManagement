using BusManagement.API.Data;
using BusManagement.API.DTOs.DashboardDTOs;
using Microsoft.EntityFrameworkCore;

namespace BusManagement.API.Services;

public class DashboardService(BusManagementDbContext db)
{
    public async Task<DashboardSummary> GetSummaryAsync()
    {
        var totalStops = await db.Stops.CountAsync();
        var activeStops = await db.Stops.CountAsync(s => s.IsActive);
        var totalRoutes = await db.Routes.CountAsync();
        var activeRoutes = await db.Routes.CountAsync(r => r.IsActive);
        var totalFares = await db.Fares.CountAsync();
        var routesWithNoStops = await db.Routes.CountAsync(r => !r.RouteStops.Any());
        var stopsWithNoCoords = await db.Stops.CountAsync(s => s.Latitude == null || s.Longitude == null);
        var lastImported = await db.Stops
            .OrderByDescending(s => s.CreatedDate)
            .Select(s => (DateTime?)s.CreatedDate)
            .FirstOrDefaultAsync();

        return new DashboardSummary(
            totalStops, activeStops, totalStops - activeStops,
            totalRoutes, activeRoutes, totalRoutes - activeRoutes,
            totalFares, routesWithNoStops, stopsWithNoCoords,
            lastImported);
    }
}
