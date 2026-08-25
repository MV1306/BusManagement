using BusManagement.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace BusManagement.API.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController(DashboardService dashboardService) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary() => Ok(await dashboardService.GetSummaryAsync());
}
