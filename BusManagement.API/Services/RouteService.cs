using BusManagement.API.Data;
using BusManagement.API.DTOs;
using BusManagement.API.DTOs.RouteDTOs;
using Microsoft.EntityFrameworkCore;

namespace BusManagement.API.Services;

public class RouteService(BusManagementDbContext db, SmartRouteService smartRouteService)
{
    public async Task<PagedResult<RouteResponse>> GetAllAsync(int page, int pageSize, string? search = null)
    {
        var query = db.Routes
            .Where(r => search == null || EF.Functions.ILike(r.RouteCode, $"%{search}%") || EF.Functions.ILike(r.RouteName, $"%{search}%"))
            .OrderBy(x => x.RouteCode);
        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new RouteResponse(
                r.RouteId, r.RouteCode, r.RouteName, r.IsActive,
                r.RouteStops.OrderBy(rs => rs.StopOrder).Select(rs => rs.Stop.StopName).FirstOrDefault(),
                r.RouteStops.OrderByDescending(rs => rs.StopOrder).Select(rs => rs.Stop.StopName).FirstOrDefault()))
            .ToListAsync();
        return new PagedResult<RouteResponse>(items, total, page, pageSize);
    }

    public async Task<RouteResponse?> GetByIdAsync(int id) =>
        await db.Routes
            .Where(r => r.RouteId == id)
            .Select(r => new RouteResponse(
                r.RouteId, r.RouteCode, r.RouteName, r.IsActive,
                r.RouteStops.OrderBy(rs => rs.StopOrder).Select(rs => rs.Stop.StopName).FirstOrDefault(),
                r.RouteStops.OrderByDescending(rs => rs.StopOrder).Select(rs => rs.Stop.StopName).FirstOrDefault()))
            .FirstOrDefaultAsync();

    public async Task<RouteResponse> CreateAsync(CreateRouteRequest req)
    {
        var route = new Models.Route
        {
            RouteCode = req.RouteCode,
            RouteName = req.RouteName,
            CreatedBy = req.CreatedBy
        };
        db.Routes.Add(route);
        await db.SaveChangesAsync();
        return new RouteResponse(route.RouteId, route.RouteCode, route.RouteName, route.IsActive, null, null);
    }

    public async Task<RouteResponse?> UpdateAsync(int id, UpdateRouteRequest req)
    {
        var route = await db.Routes.FindAsync(id);
        if (route is null) return null;
        route.RouteCode = req.RouteCode;
        route.RouteName = req.RouteName;
        route.IsActive = req.IsActive;
        route.ModifiedBy = req.ModifiedBy;
        route.ModifiedDate = DateTime.UtcNow;
        await db.SaveChangesAsync();
        smartRouteService.InvalidateGraphCache();
        return new RouteResponse(route.RouteId, route.RouteCode, route.RouteName, route.IsActive, null, null);
    }

    public async Task<RouteResponse?> SetStatusAsync(int id, bool isActive)
    {
        var route = await db.Routes.FindAsync(id);
        if (route is null) return null;
        route.IsActive = isActive;
        route.ModifiedDate = DateTime.UtcNow;
        await db.SaveChangesAsync();
        smartRouteService.InvalidateGraphCache();
        return new RouteResponse(route.RouteId, route.RouteCode, route.RouteName, route.IsActive, null, null);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var route = await db.Routes.FindAsync(id);
        if (route is null) return false;
        db.Routes.Remove(route);
        await db.SaveChangesAsync();
        smartRouteService.InvalidateGraphCache();
        return true;
    }

    public async Task<RouteResponse?> DuplicateAsync(int routeId, DuplicateRouteRequest req)
    {
        var source = await db.Routes
            .Include(r => r.RouteStages)
            .Include(r => r.RouteStops)
            .FirstOrDefaultAsync(r => r.RouteId == routeId);
        if (source is null) return null;

        var newRoute = new Models.Route
        {
            RouteCode = req.NewRouteCode,
            RouteName = req.NewRouteName,
            IsActive = false
        };
        db.Routes.Add(newRoute);
        await db.SaveChangesAsync();

        // Duplicate stages and build old->new stage id map
        var stageIdMap = new Dictionary<int, int>();
        foreach (var stage in source.RouteStages)
        {
            var newStage = new Models.RouteStage
            {
                RouteId = newRoute.RouteId,
                StageName = stage.StageName,
                StageOrder = stage.StageOrder,
                DistanceFromPreviousKm = stage.DistanceFromPreviousKm
            };
            db.RouteStages.Add(newStage);
            stageIdMap[stage.RouteStageId] = newStage.RouteStageId; // will be set after SaveChanges
        }
        await db.SaveChangesAsync();

        // Now stageIdMap values are 0 — rebuild after save using StageName+StageOrder as key
        var savedStages = await db.RouteStages
            .Where(rs => rs.RouteId == newRoute.RouteId)
            .ToListAsync();
        var stageOrderMap = source.RouteStages
            .Join(savedStages, s => s.StageOrder, n => n.StageOrder, (s, n) => (OldId: s.RouteStageId, NewId: n.RouteStageId))
            .ToDictionary(x => x.OldId, x => x.NewId);

        foreach (var rs in source.RouteStops)
            db.RouteStops.Add(new Models.RouteStop
            {
                RouteId = newRoute.RouteId,
                StopId = rs.StopId,
                RouteStageId = stageOrderMap[rs.RouteStageId],
                StopOrder = rs.StopOrder
            });
        await db.SaveChangesAsync();

        return await GetByIdAsync(newRoute.RouteId);
    }

    public async Task<List<RouteCoverageResponse>> GetCoverageAsync() =>
        await db.Routes
            .Where(r => r.IsActive)
            .Select(r => new RouteCoverageResponse(
                r.RouteId, r.RouteCode, r.RouteName, r.IsActive,
                r.RouteStops
                    .OrderBy(rs => rs.StopOrder)
                    .Select(rs => new RouteCoverageStop(
                        rs.StopOrder, rs.Stop.StopName, rs.Stop.StopCode,
                        rs.Stop.Latitude, rs.Stop.Longitude,
                        rs.StopOrder == r.RouteStops.Min(x => x.StopOrder),
                        rs.StopOrder == r.RouteStops.Max(x => x.StopOrder)))
                    .ToList()))
            .ToListAsync();

    public async Task<RouteCardResponse?> GetCardAsync(int routeId)
    {
        var route = await db.Routes
            .Include(r => r.RouteStages)
            .Include(r => r.RouteStops).ThenInclude(rs => rs.Stop)
            .Include(r => r.RouteStops).ThenInclude(rs => rs.RouteStage)
            .FirstOrDefaultAsync(r => r.RouteId == routeId);
        if (route is null) return null;

        var orderedStages = route.RouteStages.OrderBy(rs => rs.StageOrder).ToList();
        int minStage = orderedStages.FirstOrDefault()?.StageOrder ?? 0;
        int maxStage = orderedStages.LastOrDefault()?.StageOrder ?? 0;

        double cumulative = 0;
        var stages = orderedStages.Select(rs =>
        {
            cumulative += rs.DistanceFromPreviousKm ?? 0;
            return new RouteCardStop(
                rs.StageOrder, rs.StageName, rs.StageName,
                rs.DistanceFromPreviousKm, Math.Round(cumulative, 2),
                rs.StageOrder == minStage, rs.StageOrder == maxStage);
        }).ToList();

        var fares = await db.Fares
            .Where(f => f.IsActive)
            .OrderBy(f => f.BusType).ThenBy(f => f.Stages)
            .Select(f => new RouteCardFare(f.BusType.ToString(), f.Stages, f.FareAmount))
            .ToListAsync();

        var orderedStops = route.RouteStops.OrderBy(rs => rs.StopOrder).ToList();

        return new RouteCardResponse(
            route.RouteCode, route.RouteName,
            orderedStops.FirstOrDefault()?.Stop.StopName,
            orderedStops.LastOrDefault()?.Stop.StopName,
            orderedStops.Count, Math.Round(cumulative, 2), route.IsActive,
            stages, fares);
    }
}
