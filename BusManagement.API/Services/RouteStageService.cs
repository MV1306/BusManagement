using BusManagement.API.Data;
using BusManagement.API.DTOs.RouteStageDTOs;
using BusManagement.API.Models;
using Microsoft.EntityFrameworkCore;

namespace BusManagement.API.Services;

public class RouteStageService(BusManagementDbContext db)
{
    public async Task<List<RouteStageResponse>> GetByRouteAsync(int routeId)
    {
        var stages = await db.RouteStages
            .Where(rs => rs.RouteId == routeId)
            .OrderBy(rs => rs.StageOrder)
            .ToListAsync();

        int min = stages.Count > 0 ? stages.Min(s => s.StageOrder) : 0;
        int max = stages.Count > 0 ? stages.Max(s => s.StageOrder) : 0;

        return stages.Select(rs => new RouteStageResponse(
            rs.RouteStageId, rs.StageName, rs.StageOrder, rs.DistanceFromPreviousKm,
            rs.StageOrder == min, rs.StageOrder == max)).ToList();
    }

    public async Task<(RouteStageResponse? Stage, string? Error)> AddStageAsync(int routeId, AddRouteStageRequest req)
    {
        bool orderExists = await db.RouteStages.AnyAsync(rs => rs.RouteId == routeId && rs.StageOrder == req.StageOrder);
        if (orderExists)
            return (null, $"A stage with order {req.StageOrder} already exists for this route.");

        var stage = new RouteStage
        {
            RouteId = routeId,
            StageName = req.StageName,
            StageOrder = req.StageOrder,
            DistanceFromPreviousKm = req.DistanceFromPreviousKm
        };
        db.RouteStages.Add(stage);
        await db.SaveChangesAsync();

        var all = await db.RouteStages.Where(rs => rs.RouteId == routeId).ToListAsync();
        int min = all.Min(s => s.StageOrder);
        int max = all.Max(s => s.StageOrder);

        return (new RouteStageResponse(stage.RouteStageId, stage.StageName, stage.StageOrder,
            stage.DistanceFromPreviousKm, stage.StageOrder == min, stage.StageOrder == max), null);
    }

    public async Task<(RouteStageResponse? Stage, string? Error)> UpdateStageAsync(int routeId, int stageId, UpdateRouteStageRequest req)
    {
        var stage = await db.RouteStages.FirstOrDefaultAsync(rs => rs.RouteStageId == stageId && rs.RouteId == routeId);
        if (stage is null) return (null, "Stage not found.");

        stage.StageName = req.StageName;
        stage.StageOrder = req.StageOrder;
        stage.DistanceFromPreviousKm = req.DistanceFromPreviousKm;
        await db.SaveChangesAsync();

        var all = await db.RouteStages.Where(rs => rs.RouteId == routeId).ToListAsync();
        int min = all.Min(s => s.StageOrder);
        int max = all.Max(s => s.StageOrder);

        return (new RouteStageResponse(stage.RouteStageId, stage.StageName, stage.StageOrder,
            stage.DistanceFromPreviousKm, stage.StageOrder == min, stage.StageOrder == max), null);
    }

    public async Task ReorderAsync(int routeId, ReorderRouteStagesRequest req)
    {
        // Use a large offset to avoid unique constraint conflicts during reorder
        int offset = 10000;
        foreach (var item in req.Stages)
            await db.Database.ExecuteSqlRawAsync(
                "UPDATE \"RouteStages\" SET \"StageOrder\" = {0} WHERE \"RouteStageId\" = {1} AND \"RouteId\" = {2}",
                item.StageOrder + offset, item.RouteStageId, routeId);

        foreach (var item in req.Stages)
            await db.Database.ExecuteSqlRawAsync(
                "UPDATE \"RouteStages\" SET \"StageOrder\" = {0} WHERE \"RouteStageId\" = {1} AND \"RouteId\" = {2}",
                item.StageOrder, item.RouteStageId, routeId);
    }

    public async Task<bool> RemoveStageAsync(int routeId, int stageId)
    {
        var stage = await db.RouteStages.FirstOrDefaultAsync(rs => rs.RouteStageId == stageId && rs.RouteId == routeId);
        if (stage is null) return false;
        db.RouteStages.Remove(stage);
        await db.SaveChangesAsync();
        return true;
    }
}
