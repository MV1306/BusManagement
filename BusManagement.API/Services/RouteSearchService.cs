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
                BoardingStageOrder = r.RouteStops.Where(rs => rs.StopId == fromStopId).Select(rs => rs.RouteStage.StageOrder).First(),
                DestStageOrder = r.RouteStops.Where(rs => rs.StopId == toStopId).Select(rs => rs.RouteStage.StageOrder).First(),
                TotalStops = r.RouteStops.Count,
                AllStages = r.RouteStages.OrderBy(rs => rs.StageOrder).ToList(),
                BusTypes = r.RouteBusTypes.Select(bt => bt.BusType.ToString()).ToList()
            })
            .ToListAsync();

        var validRoutes = routes.Select(r =>
        {
            int minOrder = Math.Min(r.BoardingStageOrder, r.DestStageOrder);
            int maxOrder = Math.Max(r.BoardingStageOrder, r.DestStageOrder);
            double distKm = Math.Round(r.AllStages
                .Where(s => s.StageOrder > minOrder && s.StageOrder <= maxOrder)
                .Sum(s => s.DistanceFromPreviousKm ?? 0), 2);
            int stages = maxOrder - minOrder + 1;
            return new DirectRouteResult(r.RouteId, r.RouteCode, r.RouteName,
                r.BoardingStageOrder, r.DestStageOrder, stages, distKm, null, r.BusTypes);
        }).ToList();

        return new RouteSearchResponse(fromStop.StopName, toStop.StopName, validRoutes);
    }
}
