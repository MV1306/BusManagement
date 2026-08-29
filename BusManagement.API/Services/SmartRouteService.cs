using BusManagement.API.Algorithms;
using BusManagement.API.Data;
using BusManagement.API.DTOs.RouteSearchDTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace BusManagement.API.Services;

public class SmartRouteService(BusManagementDbContext db, IMemoryCache cache)
{
    private const string GraphCacheKey = "route_graph_edges";

    public void InvalidateGraphCache() => cache.Remove(GraphCacheKey);

    public async Task<SmartRouteResponse?> SearchAsync(int fromStopId, int toStopId,
        RoutingCriteria criteria = RoutingCriteria.ShortestDistance)
    {
        var fromStop = await db.Stops.FindAsync(fromStopId);
        var toStop = await db.Stops.FindAsync(toStopId);
        if (fromStop is null || toStop is null) return null;

        var edges = await cache.GetOrCreateAsync(GraphCacheKey, async entry =>
        {
            entry.SlidingExpiration = TimeSpan.FromMinutes(10);
            var routeStops = await db.RouteStops
                .Include(rs => rs.Route)
                .Where(rs => rs.Route.IsActive)
                .OrderBy(rs => rs.RouteId).ThenBy(rs => rs.StopOrder)
                .ToListAsync();

            var result = new List<GraphEdge>();
            foreach (var group in routeStops.GroupBy(rs => rs.RouteId))
            {
                var stops = group.OrderBy(rs => rs.StopOrder).ToList();
                for (int i = 0; i < stops.Count - 1; i++)
                {
                    double dist = stops[i + 1].DistanceFromPreviousKm;
                    result.Add(new GraphEdge { FromStopId = stops[i].StopId, ToStopId = stops[i + 1].StopId, RouteId = stops[i].RouteId, RouteCode = stops[i].Route.RouteCode, RouteName = stops[i].Route.RouteName, DistanceKm = dist, StopOrder = stops[i].StopOrder });
                    result.Add(new GraphEdge { FromStopId = stops[i + 1].StopId, ToStopId = stops[i].StopId, RouteId = stops[i].RouteId, RouteCode = stops[i].Route.RouteCode, RouteName = stops[i].Route.RouteName, DistanceKm = dist, StopOrder = stops[i + 1].StopOrder });
                }
            }
            return result;
        }) ?? [];

        var algo = new DijkstraRouteAlgorithm(edges);
        var segments = algo.FindPath(fromStopId, toStopId, criteria);
        if (segments is null) return null;

        // Load stop names + coords for all stop IDs in path
        var allStopIds = segments.SelectMany(s => s.SelectMany(e => new[] { e.FromStopId, e.ToStopId })).Distinct().ToList();
        var stopData = await db.Stops
            .Where(s => allStopIds.Contains(s.StopId))
            .ToDictionaryAsync(s => s.StopId, s => new { s.StopName, s.Latitude, s.Longitude });

        // Load stage first-stop orders per route for stage boundary detection
        var routeIds = segments.Select(s => s[0].RouteId).Distinct().ToList();
        var stageFirstOrders = await db.RouteStops
            .Where(rs => routeIds.Contains(rs.RouteId))
            .GroupBy(rs => new { rs.RouteId, rs.RouteStageId })
            .Select(g => new { g.Key.RouteId, MinOrder = g.Min(rs => rs.StopOrder) })
            .ToListAsync();
        var stageFirstByRoute = stageFirstOrders
            .GroupBy(x => x.RouteId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.MinOrder).ToHashSet());

        var resultSegments = segments.Select(seg =>
        {
            var stageFirstSet = stageFirstByRoute.GetValueOrDefault(seg[0].RouteId, []);
            var lastStop = stopData.GetValueOrDefault(seg[^1].ToStopId);
            var stopCoords = seg.Select(e =>
            {
                var s = stopData.GetValueOrDefault(e.FromStopId);
                return new StopCoord(s?.StopName ?? "", s?.Latitude, s?.Longitude, stageFirstSet.Contains(e.StopOrder));
            }).Append(new StopCoord(lastStop?.StopName ?? "", lastStop?.Latitude, lastStop?.Longitude, false))
              .ToList();
            return new RouteSegment(
                seg[0].RouteId, seg[0].RouteCode, seg[0].RouteName,
                seg[0].FromStopId, stopData.GetValueOrDefault(seg[0].FromStopId)?.StopName ?? "",
                seg[^1].ToStopId, stopData.GetValueOrDefault(seg[^1].ToStopId)?.StopName ?? "",
                seg.Count + 1,
                Math.Round(seg.Sum(e => e.DistanceKm), 2),
                stopCoords);
        }).ToList();

        return new SmartRouteResponse(
            fromStop.StopName,
            toStop.StopName,
            Math.Round(resultSegments.Sum(s => s.DistanceKm), 2),
            resultSegments.Sum(s => s.Stops),
            segments.Count - 1,
            resultSegments);
    }
}
