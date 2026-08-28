using BusManagement.API.Algorithms;
using BusManagement.API.Models;
using BusManagement.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace BusManagement.API.Controllers;

[ApiController]
[Route("api/journey")]
public class JourneyPlannerController(JourneyPlannerService journeyPlannerService) : ControllerBase
{
    [HttpGet("plan")]
    public async Task<IActionResult> Plan(
        [FromQuery] int fromStopId,
        [FromQuery] int toStopId,
        [FromQuery] BusType busType,
        [FromQuery] RoutingCriteria criteria = RoutingCriteria.ShortestDistance)
    {
        var result = await journeyPlannerService.PlanAsync(fromStopId, toStopId, busType, criteria);
        return result is null ? NotFound("No route found between the specified stops.") : Ok(result);
    }
}
