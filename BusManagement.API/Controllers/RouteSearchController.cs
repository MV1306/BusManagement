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
        try
        {
            var result = await routeSearchService.SearchAsync(fromStopId, toStopId);
            return result is null ? NotFound() : Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message, detail = ex.InnerException?.Message });
        }
    }
}
