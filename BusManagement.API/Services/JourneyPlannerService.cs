using BusManagement.API.Algorithms;
using BusManagement.API.DTOs.JourneyPlannerDTOs;
using BusManagement.API.Models;

namespace BusManagement.API.Services;

public class JourneyPlannerService(SmartRouteService smartRouteService, FareCalculationService fareCalcService)
{
    public async Task<JourneyPlanResponse?> PlanAsync(
        int fromStopId, int toStopId, BusType busType,
        RoutingCriteria criteria = RoutingCriteria.ShortestDistance)
    {
        var route = await smartRouteService.SearchAsync(fromStopId, toStopId, criteria);
        if (route is null) return null;

        var legs = new List<JourneyLeg>();
        decimal totalFare = 0;

        foreach (var seg in route.Segments)
        {
            var (stages, _, _) = await fareCalcService.GetStagesAndDistanceAsync(seg.RouteId, seg.FromStopId, seg.ToStopId);
            var fare = await fareCalcService.CalculateByBusTypeAndStagesAsync(busType, stages);
            totalFare += fare;
            legs.Add(new JourneyLeg(seg.RouteCode, seg.RouteName, seg.FromStop, seg.ToStop, seg.Stops, seg.DistanceKm, stages, fare));
        }

        return new JourneyPlanResponse(
            route.From, route.To, busType,
            route.TotalDistanceKm, route.TotalStops, route.Transfers,
            totalFare, legs);
    }
}
