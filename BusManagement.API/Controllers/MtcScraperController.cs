using System.Net;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;

namespace BusManagement.API.Controllers;

[ApiController]
[Route("api/mtc")]
public partial class MtcScraperController(IHttpClientFactory httpFactory) : ControllerBase
{
    [HttpGet("stages")]
    public async Task<IActionResult> GetStages([FromQuery] string route)
    {
        if (string.IsNullOrWhiteSpace(route))
            return BadRequest(new { message = "route is required" });

        var client = httpFactory.CreateClient("MtcScraper");
        HttpResponseMessage res;
        try
        {
            res = await client.GetAsync($"https://mtcbus.tn.gov.in/Home/routewiseinfo?selroute={Uri.EscapeDataString(route)}");
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = $"Failed to reach MTC website: {ex.Message}" });
        }

        if (!res.IsSuccessStatusCode)
            return StatusCode(502, new { message = $"MTC website returned {res.StatusCode}" });

        var html = await res.Content.ReadAsStringAsync();

        // Extract stages from <ul class="route"><li><span>N</span> STAGE_NAME</li>...
        var stageMatches = StagePattern().Matches(html);
        if (stageMatches.Count == 0)
            return NotFound(new { message = $"No stages found for route '{route}'. The route may not exist." });

        var stages = stageMatches.Select(m => new
        {
            order = int.Parse(m.Groups[1].Value),
            name  = WebUtility.HtmlDecode(m.Groups[2].Value.Trim()),
        }).ToList();

        // Extract origin / destination from .type divs
        var origin      = InfoPattern("Origin").Match(html).Groups[1].Value.Trim();
        var destination = InfoPattern("Destination").Match(html).Groups[1].Value.Trim();

        return Ok(new
        {
            routeCode   = route.ToUpperInvariant(),
            origin      = WebUtility.HtmlDecode(origin),
            destination = WebUtility.HtmlDecode(destination),
            totalStages = stages.Count,
            stages,
        });
    }

    [GeneratedRegex(@"<li><span>(\d+)</span>\s*([^<]+)</li>")]
    private static partial Regex StagePattern();

    private static Regex InfoPattern(string label) =>
        new($@"{label}</span>\s*<h5>([^<]+)</h5>", RegexOptions.IgnoreCase);
}
