using BusManagement.API.Data;
using BusManagement.API.DTOs.FareDTOs;
using BusManagement.API.Models;
using Microsoft.EntityFrameworkCore;

namespace BusManagement.API.Services;

public class FareCalculationService(BusManagementDbContext db)
{
    public async Task<FareCalculationResponse?> CalculateAsync(int routeId, int fromStopId, int toStopId, BusType busType)
    {
        var ids = new[] { fromStopId, toStopId };
        var lookup = await db.Stops.Where(s => ids.Contains(s.StopId)).ToDictionaryAsync(s => s.StopId);
        var route = await db.Routes.FindAsync(routeId);
        if (route is null || !lookup.TryGetValue(fromStopId, out var fromStop) || !lookup.TryGetValue(toStopId, out var toStop))
            return null;

        var (stages, totalStops, distKm) = await GetStagesAndDistanceAsync(routeId, fromStopId, toStopId);

        var fare = await db.Fares
            .Where(f => f.BusType == busType && f.Stages == stages && f.IsActive)
            .FirstOrDefaultAsync();

        return new FareCalculationResponse(route.RouteCode, busType,
            fromStop.StopName, toStop.StopName, stages, totalStops, distKm, fare?.FareAmount ?? 0);
    }

    public async Task<FareAllTypesResponse?> CalculateAllTypesAsync(int routeId, int fromStopId, int toStopId)
    {
        var ids = new[] { fromStopId, toStopId };
        var lookup = await db.Stops.Where(s => ids.Contains(s.StopId)).ToDictionaryAsync(s => s.StopId);
        var route = await db.Routes.FindAsync(routeId);
        if (route is null || !lookup.TryGetValue(fromStopId, out var fromStop) || !lookup.TryGetValue(toStopId, out var toStop))
            return null;

        var (stages, totalStops, distKm) = await GetStagesAndDistanceAsync(routeId, fromStopId, toStopId);

        var fareRecords = await db.Fares
            .Where(f => f.Stages == stages && f.IsActive)
            .ToListAsync();

        var allTypes = Enum.GetValues<BusType>().Select(bt =>
        {
            var fareAmount = fareRecords.FirstOrDefault(f => f.BusType == bt)?.FareAmount ?? 0;
            return new FareByTypeResult(bt, stages, totalStops, distKm, fareAmount);
        }).ToList();

        return new FareAllTypesResponse(route.RouteCode, fromStop.StopName, toStop.StopName, stages, totalStops, distKm, allTypes);
    }

    public async Task<decimal> CalculateByBusTypeAndStagesAsync(BusType busType, int stages)
    {
        var fare = await db.Fares
            .Where(f => f.BusType == busType && f.Stages == stages && f.IsActive)
            .FirstOrDefaultAsync();
        return fare?.FareAmount ?? 0;
    }

    public async Task<(int stages, int totalStops, double distKm)> GetStagesAndDistanceAsync(int routeId, int fromStopId, int toStopId)
    {
        var fromStop = await db.RouteStops
            .Where(rs => rs.RouteId == routeId && rs.StopId == fromStopId)
            .Select(rs => new { rs.StopOrder, rs.RouteStage.StageOrder })
            .FirstOrDefaultAsync();

        var toStop = await db.RouteStops
            .Where(rs => rs.RouteId == routeId && rs.StopId == toStopId)
            .Select(rs => new { rs.StopOrder, rs.RouteStage.StageOrder })
            .FirstOrDefaultAsync();

        if (fromStop is null || toStop is null) return (1, 0, 0);

        int stageCount = Math.Abs(toStop.StageOrder - fromStop.StageOrder) + 1;

        int minStopOrder = Math.Min(fromStop.StopOrder, toStop.StopOrder);
        int maxStopOrder = Math.Max(fromStop.StopOrder, toStop.StopOrder);

        var segmentStops = await db.RouteStops
            .Where(rs => rs.RouteId == routeId
                && rs.StopOrder >= minStopOrder
                && rs.StopOrder <= maxStopOrder)
            .ToListAsync();

        int totalStops = segmentStops.Count;
        double distKm = Math.Round(segmentStops
            .Where(rs => rs.StopOrder > minStopOrder)
            .Sum(rs => rs.DistanceFromPreviousKm), 2);

        return (stageCount, totalStops, distKm);
    }
}
