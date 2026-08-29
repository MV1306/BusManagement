using BusManagement.API.Data;
using BusManagement.API.DTOs.RouteStopDTOs;
using BusManagement.API.Models;
using Microsoft.EntityFrameworkCore;

namespace BusManagement.API.Services;

public class RouteStopService(BusManagementDbContext db, SmartRouteService smartRouteService)
{
    public async Task<List<RouteStopResponse>> GetByRouteAsync(int routeId)
    {
        var stops = await db.RouteStops
            .Where(rs => rs.RouteId == routeId)
            .OrderBy(rs => rs.StopOrder)
            .Include(rs => rs.Stop)
            .Include(rs => rs.RouteStage)
            .ToListAsync();

        int min = stops.Count > 0 ? stops.Min(s => s.StopOrder) : 0;
        int max = stops.Count > 0 ? stops.Max(s => s.StopOrder) : 0;

        return stops.Select(rs => new RouteStopResponse(
            rs.RouteStopId, rs.StopId, rs.Stop.StopCode, rs.Stop.StopName,
            rs.Stop.Latitude ?? 0, rs.Stop.Longitude ?? 0,
            rs.StopOrder, rs.DistanceFromPreviousKm, rs.RouteStageId, rs.RouteStage.StageName,
            rs.StopOrder == min, rs.StopOrder == max)).ToList();
    }

    public async Task<(RouteStopResponse? result, string? error)> AddStopAsync(int routeId, AddRouteStopRequest req)
    {
        var stop = await db.Stops.FindAsync(req.StopId);
        if (stop is null) return (null, "Stop not found.");

        var stageExists = await db.RouteStages.AnyAsync(rs => rs.RouteStageId == req.RouteStageId && rs.RouteId == routeId);
        if (!stageExists) return (null, "RouteStage not found for this route.");

        var routeStop = new RouteStop
        {
            RouteId = routeId,
            StopId = req.StopId,
            RouteStageId = req.RouteStageId,
            StopOrder = req.StopOrder,
            DistanceFromPreviousKm = req.DistanceFromPreviousKm
        };
        db.RouteStops.Add(routeStop);
        await db.SaveChangesAsync();
        smartRouteService.InvalidateGraphCache();

        var stage = await db.RouteStages.FindAsync(req.RouteStageId);
        var all = await db.RouteStops.Where(rs => rs.RouteId == routeId).ToListAsync();
        int min = all.Min(s => s.StopOrder);
        int max = all.Max(s => s.StopOrder);

        return (new RouteStopResponse(routeStop.RouteStopId, stop.StopId, stop.StopCode, stop.StopName,
            stop.Latitude ?? 0, stop.Longitude ?? 0,
            req.StopOrder, req.DistanceFromPreviousKm, req.RouteStageId, stage!.StageName,
            req.StopOrder == min, req.StopOrder == max), null);
    }

    public async Task ReorderAsync(int routeId, List<StopOrderItem> stops)
    {
        int offset = 10000;
        foreach (var item in stops)
            await db.Database.ExecuteSqlRawAsync(
                "UPDATE \"RouteStops\" SET \"StopOrder\" = {0} WHERE \"RouteStopId\" = {1} AND \"RouteId\" = {2}",
                item.StopOrder + offset, item.RouteStopId, routeId);

        foreach (var item in stops)
            await db.Database.ExecuteSqlRawAsync(
                "UPDATE \"RouteStops\" SET \"StopOrder\" = {0}, \"DistanceFromPreviousKm\" = {1} WHERE \"RouteStopId\" = {2} AND \"RouteId\" = {3}",
                item.StopOrder, item.DistanceFromPreviousKm, item.RouteStopId, routeId);
    }

    public async Task<bool> RemoveStopAsync(int routeId, int routeStopId)
    {
        var rs = await db.RouteStops.FirstOrDefaultAsync(r => r.RouteId == routeId && r.RouteStopId == routeStopId);
        if (rs is null) return false;
        db.RouteStops.Remove(rs);
        await db.SaveChangesAsync();
        smartRouteService.InvalidateGraphCache();
        return true;
    }
}
