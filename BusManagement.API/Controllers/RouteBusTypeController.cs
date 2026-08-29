using BusManagement.API.Data;
using BusManagement.API.DTOs.RouteDTOs;
using BusManagement.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BusManagement.API.Controllers;

[ApiController]
[Route("api/routes/{routeId:int}/bus-types")]
public class RouteBusTypeController(BusManagementDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(int routeId)
    {
        var exists = await db.Routes.AnyAsync(r => r.RouteId == routeId);
        if (!exists) return NotFound();

        var items = await db.RouteBusTypes
            .Where(r => r.RouteId == routeId)
            .OrderBy(r => r.BusType)
            .Select(r => new RouteBusTypeResponse(r.RouteBusTypeId, r.RouteId, r.BusType.ToString()))
            .ToListAsync();

        return Ok(items);
    }

    [HttpPut]
    public async Task<IActionResult> Set(int routeId, [FromBody] SetRouteBusTypesRequest request)
    {
        var exists = await db.Routes.AnyAsync(r => r.RouteId == routeId);
        if (!exists) return NotFound();

        var parsed = new List<BusType>();
        foreach (var bt in request.BusTypes)
        {
            if (!Enum.TryParse<BusType>(bt, ignoreCase: true, out var busType))
                return BadRequest($"Invalid bus type: {bt}");
            parsed.Add(busType);
        }

        var existing = await db.RouteBusTypes.Where(r => r.RouteId == routeId).ToListAsync();
        db.RouteBusTypes.RemoveRange(existing);

        db.RouteBusTypes.AddRange(parsed.Distinct().Select(bt => new RouteBusType
        {
            RouteId = routeId,
            BusType = bt,
        }));

        await db.SaveChangesAsync();

        var result = await db.RouteBusTypes
            .Where(r => r.RouteId == routeId)
            .OrderBy(r => r.BusType)
            .Select(r => new RouteBusTypeResponse(r.RouteBusTypeId, r.RouteId, r.BusType.ToString()))
            .ToListAsync();

        return Ok(result);
    }
}
