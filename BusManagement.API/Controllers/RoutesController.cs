using BusManagement.API.DTOs.RouteDTOs;
using BusManagement.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace BusManagement.API.Controllers;

[ApiController]
[Route("api/routes")]
public class RoutesController(RouteService routeService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 50, [FromQuery] string? search = null) =>
        Ok(await routeService.GetAllAsync(page, pageSize, search));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var route = await routeService.GetByIdAsync(id);
        return route is null ? NotFound() : Ok(route);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateRouteRequest req)
    {
        var route = await routeService.CreateAsync(req);
        return CreatedAtAction(nameof(GetById), new { id = route.RouteId }, route);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateRouteRequest req)
    {
        var route = await routeService.UpdateAsync(id, req);
        return route is null ? NotFound() : Ok(route);
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> SetStatus(int id, UpdateRouteStatusRequest req)
    {
        var route = await routeService.SetStatusAsync(id, req.IsActive);
        return route is null ? NotFound() : Ok(route);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await routeService.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("{routeId}/duplicate")]
    public async Task<IActionResult> Duplicate(int routeId, DuplicateRouteRequest req)
    {
        var route = await routeService.DuplicateAsync(routeId, req);
        return route is null ? NotFound() : Ok(route);
    }

    [HttpGet("coverage")]
    public async Task<IActionResult> GetCoverage() => Ok(await routeService.GetCoverageAsync());

    [HttpGet("{routeId}/card")]
    public async Task<IActionResult> GetCard(int routeId)
    {
        var card = await routeService.GetCardAsync(routeId);
        return card is null ? NotFound() : Ok(card);
    }
}
