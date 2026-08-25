using BusManagement.API.Algorithms;
using BusManagement.API.DTOs.FareDTOs;
using BusManagement.API.Models;
using BusManagement.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace BusManagement.API.Controllers;

[ApiController]
[Route("api/fares")]
public class FareCalculationController(
    FareCalculationService fareCalcService,
    SmartRouteService smartRouteService) : ControllerBase
{
    [HttpGet("calculate")]
    public async Task<IActionResult> Calculate(
        [FromQuery] int routeId, [FromQuery] int fromStopId, [FromQuery] int toStopId,
        [FromQuery] BusType busType)
    {
        var result = await fareCalcService.CalculateAsync(routeId, fromStopId, toStopId, busType);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("calculate-all-types")]
    public async Task<IActionResult> CalculateAllTypes(
        [FromQuery] int routeId, [FromQuery] int fromStopId, [FromQuery] int toStopId)
    {
        var result = await fareCalcService.CalculateAllTypesAsync(routeId, fromStopId, toStopId);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("calculate-smart")]
    public async Task<IActionResult> CalculateSmart(
        [FromQuery] int fromStopId, [FromQuery] int toStopId, [FromQuery] BusType busType,
        [FromQuery] RoutingCriteria criteria = RoutingCriteria.ShortestDistance)
    {
        var route = await smartRouteService.SearchAsync(fromStopId, toStopId, criteria);
        if (route is null) return NotFound("No route found.");

        decimal total = 0;
        var segments = new List<SmartFareSegment>();

        foreach (var seg in route.Segments)
        {
            var (stages, _, _) = await fareCalcService.GetStagesAndDistanceAsync(seg.RouteId, seg.FromStopId, seg.ToStopId);
            var fare = await fareCalcService.CalculateByBusTypeAndStagesAsync(busType, stages);
            total += fare;
            segments.Add(new SmartFareSegment(seg.RouteCode, busType, seg.FromStop, seg.ToStop, stages, fare));
        }

        return Ok(new SmartFareCalculationResponse(route.From, route.To, segments, total));
    }
}
