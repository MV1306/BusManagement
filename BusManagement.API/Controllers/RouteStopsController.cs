using BusManagement.API.DTOs.RouteStopDTOs;
using BusManagement.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace BusManagement.API.Controllers;

[ApiController]
[Route("api/routes/{routeId}/stops")]
public class RouteStopsController(RouteStopService routeStopService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetStops(int routeId) =>
        Ok(await routeStopService.GetByRouteAsync(routeId));

    [HttpPost]
    public async Task<IActionResult> AddStop(int routeId, AddRouteStopRequest req)
    {
        var (result, error) = await routeStopService.AddStopAsync(routeId, req);
        return error is not null ? BadRequest(error) : Ok(result);
    }

    [HttpPut("reorder")]
    public async Task<IActionResult> Reorder(int routeId, List<StopOrderItem> stops)
    {
        await routeStopService.ReorderAsync(routeId, stops);
        return NoContent();
    }

    [HttpDelete("{routeStopId}")]
    public async Task<IActionResult> RemoveStop(int routeId, int routeStopId)
    {
        var removed = await routeStopService.RemoveStopAsync(routeId, routeStopId);
        return removed ? NoContent() : NotFound();
    }
}
