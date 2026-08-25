using BusManagement.API.DTOs.RouteStageDTOs;
using BusManagement.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace BusManagement.API.Controllers;

[ApiController]
[Route("api/routes/{routeId}/stages")]
public class RouteStagesController(RouteStageService routeStageService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetStages(int routeId) =>
        Ok(await routeStageService.GetByRouteAsync(routeId));

    [HttpPost]
    public async Task<IActionResult> AddStage(int routeId, AddRouteStageRequest req)
    {
        var (stage, error) = await routeStageService.AddStageAsync(routeId, req);
        if (error is not null) return Conflict(new { message = error });
        return stage is null ? BadRequest() : Ok(stage);
    }

    [HttpPut("{stageId}")]
    public async Task<IActionResult> UpdateStage(int routeId, int stageId, UpdateRouteStageRequest req)
    {
        var (result, error) = await routeStageService.UpdateStageAsync(routeId, stageId, req);
        if (error is not null) return error == "Stage not found." ? NotFound() : Conflict(new { message = error });
        return Ok(result);
    }

    [HttpPut("reorder")]
    public async Task<IActionResult> Reorder(int routeId, ReorderRouteStagesRequest req)
    {
        await routeStageService.ReorderAsync(routeId, req);
        return NoContent();
    }

    [HttpDelete("{stageId}")]
    public async Task<IActionResult> RemoveStage(int routeId, int stageId)
    {
        var removed = await routeStageService.RemoveStageAsync(routeId, stageId);
        return removed ? NoContent() : NotFound();
    }
}
