using BusManagement.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace BusManagement.API.Controllers;

[ApiController]
[Route("api/stops")]
public class GeocodingController(GeocodingService geocodingService) : ControllerBase
{
    [HttpGet("geocode")]
    public async Task<IActionResult> Geocode([FromQuery] string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return BadRequest("Stop name is required.");
        var result = await geocodingService.GeocodeAsync(name);
        return result is null
            ? NotFound("Could not find coordinates for the given stop name.")
            : Ok(new { latitude = result.Value.Lat, longitude = result.Value.Lon });
    }
}
