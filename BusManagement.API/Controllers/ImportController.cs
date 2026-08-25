using BusManagement.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace BusManagement.API.Controllers;

[ApiController]
[Route("api/import")]
public class ImportController(ImportService importService) : ControllerBase
{
    [HttpPost("stops")]
    public async Task<IActionResult> ImportStops(IFormFile file)
    {
        if (file is null || file.Length == 0) return BadRequest("No file uploaded.");
        var result = await importService.ImportStopsAsync(file);
        return Ok(result);
    }

    [HttpPost("routes")]
    public async Task<IActionResult> ImportRoutes(IFormFile file)
    {
        if (file is null || file.Length == 0) return BadRequest("No file uploaded.");
        var result = await importService.ImportRoutesAsync(file);
        return Ok(result);
    }

    [HttpPost("fares")]
    public async Task<IActionResult> ImportFares(IFormFile file)
    {
        if (file is null || file.Length == 0) return BadRequest("No file uploaded.");
        var result = await importService.ImportFaresAsync(file);
        return Ok(result);
    }
}
