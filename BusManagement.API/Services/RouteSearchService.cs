using BusManagement.API.Data;
using BusManagement.API.DTOs.RouteSearchDTOs;
using Microsoft.EntityFrameworkCore;

namespace BusManagement.API.Services;

public class RouteSearchService(BusManagementDbContext db)
{
    public async Task<RouteSearchResponse?> SearchAsync(int fromStopId, int toStopId)
    {
        var fromStop = await db.Stops.FindAsync(fromStopId);
        var toStop = await db.Stops.FindAsync(toStopId);
        if (fromStop is null || toStop is null) return null;

        // Find routes that contain both stops
        var routes = await db.Routes
            .Where(r => r.IsActive &&
                r.RouteStops.Any(rs => rs.StopId == fromStopId) &&
                r.RouteStops.Any(rs => rs.StopId == toStopId))
            .Select(r => new
            {
                r.RouteId, r.RouteCode, r.RouteName,
                BoardingStopOrder = r.RouteStops.Where(rs => rs.StopId == fromStopId).Select(rs => rs.StopOrder).First(),
                DestStopOrder = r.RouteStops.Where(rs => rs.StopId == toStopId).Select(rs => rs.StopOrder).First(),
                TotalStops = r.RouteStops.Count,
                AllStops = r.RouteStops.OrderBy(rs => rs.StopOrder).Select(rs => new { rs.StopOrder, rs.DistanceFromPreviousKm }).ToList(),
                BusTypes = r.RouteBusTypes.Select(bt => bt.BusType.ToString()).ToList()
            })
            .ToListAsync();

        var validRoutes = routes.Select(r =>
        {
            int minOrder = Math.Min(r.BoardingStopOrder, r.DestStopOrder);
            int maxOrder = Math.Max(r.BoardingStopOrder, r.DestStopOrder);
            double distKm = Math.Round(r.AllStops
                .Where(s => s.StopOrder > minOrder && s.StopOrder <= maxOrder)
                .Sum(s => s.DistanceFromPreviousKm), 2);
            int stops = maxOrder - minOrder + 1;
            return new DirectRouteResult(r.RouteId, r.RouteCode, r.RouteName,
                r.BoardingStopOrder, r.DestStopOrder, stops, distKm, null, r.BusTypes);
        }).ToList();

        return new RouteSearchResponse(fromStop.StopName, toStop.StopName, validRoutes);
    }
}
