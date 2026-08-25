using BusManagement.API.Algorithms;
using BusManagement.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace BusManagement.API.Controllers;

[ApiController]
[Route("api/routes")]
public class SmartRouteController(SmartRouteService smartRouteService) : ControllerBase
{
    [HttpGet("smart-search")]
    public async Task<IActionResult> SmartSearch(
        [FromQuery] int fromStopId,
        [FromQuery] int toStopId,
        [FromQuery] RoutingCriteria criteria = RoutingCriteria.ShortestDistance)
    {
        var result = await smartRouteService.SearchAsync(fromStopId, toStopId, criteria);
        return result is null ? NotFound("No route found between the specified stops.") : Ok(result);
    }
}
