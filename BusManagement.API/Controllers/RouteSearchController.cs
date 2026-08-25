using BusManagement.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace BusManagement.API.Controllers;

[ApiController]
[Route("api/routes")]
public class RouteSearchController(RouteSearchService routeSearchService) : ControllerBase
{
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] int fromStopId, [FromQuery] int toStopId)
    {
        var result = await routeSearchService.SearchAsync(fromStopId, toStopId);
        return result is null ? NotFound() : Ok(result);
    }
}
