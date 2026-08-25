using BusManagement.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace BusManagement.API.Controllers;

[ApiController]
[Route("api/export")]
public class ExportController(GtfsExportService gtfsExportService) : ControllerBase
{
    [HttpGet("gtfs")]
    public async Task<IActionResult> ExportGtfs()
    {
        var zip = await gtfsExportService.ExportAsync();
        return File(zip, "application/zip", "gtfs_export.zip");
    }
}
