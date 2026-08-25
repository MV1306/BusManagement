using BusManagement.API.DTOs.FareDTOs;
using BusManagement.API.Models;
using BusManagement.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace BusManagement.API.Controllers;

[ApiController]
[Route("api/fares")]
public class FareController(FareService fareService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await fareService.GetAllAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var fare = await fareService.GetByIdAsync(id);
        return fare is null ? NotFound() : Ok(fare);
    }

    [HttpGet("bus-type/{busType}")]
    public async Task<IActionResult> GetByBusType(BusType busType) =>
        Ok(await fareService.GetByBusTypeAsync(busType));

    [HttpPost]
    public async Task<IActionResult> Create(CreateFareRequest req)
    {
        var fare = await fareService.CreateAsync(req);
        return CreatedAtAction(nameof(GetById), new { id = fare.FareId }, fare);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateFareRequest req)
    {
        var fare = await fareService.UpdateAsync(id, req);
        return fare is null ? NotFound() : Ok(fare);
    }

    [HttpGet("audit")]
    public async Task<IActionResult> GetAuditLogs([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        => Ok(await fareService.GetAuditLogsAsync(page, pageSize));

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id, [FromQuery] string? deletedBy = null)
    {
        var deleted = await fareService.DeleteAsync(id, deletedBy);
        return deleted ? NoContent() : NotFound();
    }
}
