using BusManagement.API.DTOs.StopDTOs;
using BusManagement.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace BusManagement.API.Controllers;

[ApiController]
[Route("api/stops")]
public class StopsController(StopService stopService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 50, [FromQuery] string? search = null) =>
        Ok(await stopService.GetAllAsync(page, pageSize, search));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var stop = await stopService.GetByIdAsync(id);
        return stop is null ? NotFound() : Ok(stop);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateStopRequest req)
    {
        var stop = await stopService.CreateAsync(req);
        return CreatedAtAction(nameof(GetById), new { id = stop.StopId }, stop);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateStopRequest req)
    {
        var stop = await stopService.UpdateAsync(id, req);
        return stop is null ? NotFound() : Ok(stop);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await stopService.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    [HttpGet("nearby")]
    public async Task<IActionResult> GetNearby([FromQuery] double latitude, [FromQuery] double longitude, [FromQuery] double radiusKm = 2)
        => Ok(await stopService.GetNearbyAsync(latitude, longitude, radiusKm));

    [HttpPost("{id}/merge")]
    public async Task<IActionResult> Merge(int id, MergeStopsRequest req)
    {
        var result = await stopService.MergeAsync(id, req.MergeIntoStopId);
        return result is null ? BadRequest("Invalid stop IDs or same stop specified.") : Ok(result);
    }
}
