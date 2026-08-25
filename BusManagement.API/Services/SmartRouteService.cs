using BusManagement.API.Algorithms;
using BusManagement.API.Data;
using BusManagement.API.DTOs.RouteSearchDTOs;
using Microsoft.EntityFrameworkCore;

namespace BusManagement.API.Services;

public class SmartRouteService(BusManagementDbContext db)
{
    public async Task<SmartRouteResponse?> SearchAsync(int fromStopId, int toStopId,
        RoutingCriteria criteria = RoutingCriteria.ShortestDistance)
    {
        var fromStop = await db.Stops.FindAsync(fromStopId);
        var toStop = await db.Stops.FindAsync(toStopId);
        if (fromStop is null || toStop is null) return null;

        // Build graph edges from RouteStops (each consecutive stop pair is a directed edge)
        // Distance comes from the associated RouteStage
        var routeStops = await db.RouteStops
            .Include(rs => rs.Route)
            .Where(rs => rs.Route.IsActive)
            .OrderBy(rs => rs.RouteId).ThenBy(rs => rs.StopOrder)
            .ToListAsync();

        var edges = new List<GraphEdge>();
        var grouped = routeStops.GroupBy(rs => rs.RouteId);
        foreach (var group in grouped)
        {
            var stops = group.OrderBy(rs => rs.StopOrder).ToList();
            for (int i = 0; i < stops.Count - 1; i++)
            {
                double dist = stops[i + 1].DistanceFromPreviousKm;

                // Forward edge
                edges.Add(new GraphEdge
                {
                    FromStopId = stops[i].StopId,
                    ToStopId = stops[i + 1].StopId,
                    RouteId = stops[i].RouteId,
                    RouteCode = stops[i].Route.RouteCode,
                    RouteName = stops[i].Route.RouteName,
                    DistanceKm = dist,
                    StopOrder = stops[i].StopOrder
                });

                // Reverse edge
                edges.Add(new GraphEdge
                {
                    FromStopId = stops[i + 1].StopId,
                    ToStopId = stops[i].StopId,
                    RouteId = stops[i].RouteId,
                    RouteCode = stops[i].Route.RouteCode,
                    RouteName = stops[i].Route.RouteName,
                    DistanceKm = dist,
                    StopOrder = stops[i + 1].StopOrder
                });
            }
        }

        var algo = new DijkstraRouteAlgorithm(edges);
        var segments = algo.FindPath(fromStopId, toStopId, criteria);
        if (segments is null) return null;

        // Load stop names for all stop IDs in path
        var allStopIds = segments.SelectMany(s => s.SelectMany(e => new[] { e.FromStopId, e.ToStopId })).Distinct().ToList();
        var stopNames = await db.Stops
            .Where(s => allStopIds.Contains(s.StopId))
            .ToDictionaryAsync(s => s.StopId, s => s.StopName);

        var resultSegments = segments.Select(seg => new RouteSegment(
            seg[0].RouteId,
            seg[0].RouteCode,
            seg[0].RouteName,
            seg[0].FromStopId,
            stopNames.GetValueOrDefault(seg[0].FromStopId, ""),
            seg[^1].ToStopId,
            stopNames.GetValueOrDefault(seg[^1].ToStopId, ""),
            seg.Count + 1,
            Math.Round(seg.Sum(e => e.DistanceKm), 2)
        )).ToList();

        return new SmartRouteResponse(
            fromStop.StopName,
            toStop.StopName,
            Math.Round(resultSegments.Sum(s => s.DistanceKm), 2),
            resultSegments.Sum(s => s.Stops),
            segments.Count - 1,
            resultSegments);
    }
}
