using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using BusManagement.API.Data;
using BusManagement.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BusManagement.API.Controllers;

[ApiController]
[Route("api/mtc")]
public partial class MtcScraperController(IHttpClientFactory httpFactory, BusManagementDbContext db) : ControllerBase
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

    // ── Chalo stop import ────────────────────────────────────────────────

    [HttpPost("import-stops/{routeId}")]
    public async Task<IActionResult> ImportStopsFromChalo(int routeId)
    {
        // Load route + its stages (already imported from MTC)
        var stages = await db.RouteStages
            .Where(s => s.RouteId == routeId)
            .OrderBy(s => s.StageOrder)
            .ToListAsync();

        if (stages.Count == 0)
            return BadRequest(new { message = "Import stages from MTC first before importing stops." });

        var route = await db.Routes.FindAsync(routeId);
        if (route is null) return NotFound(new { message = "Route not found." });

        var client = httpFactory.CreateClient("MtcScraper");
        var day = DateTime.UtcNow.DayOfWeek.ToString().ToLower();

        // 1. Search Chalo for this route code
        HttpResponseMessage searchRes;
        try
        {
            searchRes = await client.GetAsync(
                $"https://chalo.com/app/api/scheduler_v4/v4/chennai/search?str={Uri.EscapeDataString(route.RouteCode)}&day={day}");
        }
        catch (Exception ex) { return StatusCode(502, new { message = $"Chalo search failed: {ex.Message}" }); }

        if (!searchRes.IsSuccessStatusCode)
            return StatusCode(502, new { message = $"Chalo search returned {searchRes.StatusCode}" });

        var searchJson = await searchRes.Content.ReadAsStringAsync();
        var searchResult = JsonSerializer.Deserialize<ChaloSearchResult>(searchJson, JsonOpts);
        if (searchResult?.Routes is null || searchResult.Routes.Count == 0)
            return NotFound(new { message = $"Route '{route.RouteCode}' not found on Chalo." });

        // 2. Find the best matching variant: exact route_name match, then match first/last stop to first/last stage
        var firstStageName = stages.First().StageName;
        var lastStageName  = stages.Last().StageName;

        var exactMatches = searchResult.Routes
            .Where(r => string.Equals(r.RouteName, route.RouteCode, StringComparison.OrdinalIgnoreCase))
            .ToList();

        // Score each variant in both forward and reverse directions against MTC stages
        // Forward: Chalo first→MTC first, Chalo last→MTC last
        // Reverse: Chalo first→MTC last, Chalo last→MTC first (wrong direction)
        // Pick variant+direction with highest score; if reversed wins, flip the stages list
        var best = exactMatches
            .Select(r => new
            {
                Route        = r,
                ForwardScore = NameSimilarity(r.FirstStopName, firstStageName) + NameSimilarity(r.LastStopName, lastStageName),
                ReverseScore = NameSimilarity(r.FirstStopName, lastStageName)  + NameSimilarity(r.LastStopName, firstStageName),
            })
            .OrderByDescending(x => Math.Max(x.ForwardScore, x.ReverseScore))
            .FirstOrDefault();

        if (best is null)
            return NotFound(new { message = $"No exact match for route '{route.RouteCode}' on Chalo. Found: {string.Join(", ", searchResult.Routes.Select(r => r.RouteName).Distinct())}" });

        // If the variant matches better in reverse, flip the stages so proportional assignment is correct
        if (best.ReverseScore > best.ForwardScore)
            stages = [.. stages.OrderByDescending(s => s.StageOrder)];

        var bestRoute = best.Route;

        // 3. Fetch full stop sequence from Chalo
        HttpResponseMessage detailRes;
        try
        {
            detailRes = await client.GetAsync(
                $"https://chalo.com/app/api/scheduler_v4/v4/chennai/routedetailslive?route_id={bestRoute.RouteId}&day={day}");
        }
        catch (Exception ex) { return StatusCode(502, new { message = $"Chalo detail fetch failed: {ex.Message}" }); }

        var detailJson = await detailRes.Content.ReadAsStringAsync();
        var detail = JsonSerializer.Deserialize<ChaloRouteDetail>(detailJson, JsonOpts);
        var chaloStops = detail?.Route?.StopSequence;

        if (chaloStops is null || chaloStops.Count == 0)
            return NotFound(new { message = "No stops found in Chalo response." });

        // 4. Load existing stops from DB for name-matching + existing codes for uniqueness
        var existingStops = await db.Stops.ToListAsync();
        var existingCodes = existingStops.Select(s => s.StopCode).ToHashSet(StringComparer.OrdinalIgnoreCase);
        int codeCounter = await db.Stops.MaxAsync(s => (int?)s.StopId) ?? 0;

        // 5. Clear existing route stops before reimport
        var existingRouteStops = await db.RouteStops.Where(rs => rs.RouteId == routeId).ToListAsync();
        db.RouteStops.RemoveRange(existingRouteStops);
        await db.SaveChangesAsync();

        // 6. Assign each Chalo stop to the best matching stage
        // Build a lookup: stage index by position ratio
        int created = 0, matched = 0;
        var routeStops = new List<RouteStop>();

        for (int i = 0; i < chaloStops.Count; i++)
        {
            var cs = chaloStops[i];

            // Find or create stop — priority: coordinate proximity → normalized name
            var existing = FindExistingStop(existingStops, cs.StopName, cs.Lat, cs.Lon);

            Stop stop;
            if (existing is not null)
            {
                // Update coordinates if missing
                if (existing.Latitude is null && cs.Lat != 0)
                {
                    existing.Latitude  = cs.Lat;
                    existing.Longitude = cs.Lon;
                }
                stop = existing;
                matched++;
            }
            else
            {
                string code;
                do { code = GenerateStopCode(cs.StopName, ++codeCounter); }
                while (existingCodes.Contains(code));
                existingCodes.Add(code);

                stop = new Stop
                {
                    StopCode  = code,
                    StopName  = cs.StopName.Trim().ToUpperInvariant(),
                    Latitude  = cs.Lat != 0 ? cs.Lat : null,
                    Longitude = cs.Lon != 0 ? cs.Lon : null,
                    CreatedBy = "ChaloImport",
                };
                db.Stops.Add(stop);
                existingStops.Add(stop);
                created++;
            }

            // Map stop to stage: distribute stops proportionally across stages
            double ratio = stages.Count == 1 ? 0 : (double)i / (chaloStops.Count - 1);
            int stageIndex = (int)Math.Round(ratio * (stages.Count - 1));
            stageIndex = Math.Clamp(stageIndex, 0, stages.Count - 1);
            var stage = stages[stageIndex];

            // Calculate distance from previous stop using haversine
            double dist = 0;
            if (i > 0)
            {
                var prev = chaloStops[i - 1];
                dist = Haversine(prev.Lat, prev.Lon, cs.Lat, cs.Lon);
                dist = Math.Round(dist, 2);
            }

            routeStops.Add(new RouteStop
            {
                RouteId              = routeId,
                Stop                 = stop,
                RouteStageId         = stage.RouteStageId,
                StopOrder            = i + 1,
                DistanceFromPreviousKm = dist,
            });
        }

        db.RouteStops.AddRange(routeStops);
        await db.SaveChangesAsync();

        return Ok(new
        {
            message        = $"Import complete. {chaloStops.Count} stops assigned to route '{route.RouteCode}'.",
            totalStops     = chaloStops.Count,
            stopsCreated   = created,
            stopsMatched   = matched,
            chaloRouteId   = bestRoute.RouteId,
            chaloDirection = bestRoute.DirectionStopName,
        });
    }

    // Match rules:
    // 1. Coords available on both sides → must be within 200m. Name is ignored.
    // 2. Chalo has coords, DB stop has no coords → name match only (coords will be filled in)
    // 3. Neither has coords → name match only
    // Name match = normalised exact OR one contains the other (min 5 chars)
    // If name matches but coords are available and distance > 500m → NOT a match (different physical stop)
    private static Stop? FindExistingStop(List<Stop> stops, string chaloName, double lat, double lon)
    {
        bool chaloHasCoords = lat != 0 && lon != 0;

        // 1. Coordinate-first: find closest stop within 200m that also has a reasonable name overlap
        if (chaloHasCoords)
        {
            var byCoord = stops
                .Where(s => s.Latitude.HasValue && s.Longitude.HasValue)
                .Select(s => (stop: s, dist: Haversine(lat, lon, s.Latitude!.Value, s.Longitude!.Value)))
                .Where(x => x.dist <= 0.2)   // 200 m
                .OrderBy(x => x.dist)
                .FirstOrDefault();
            if (byCoord.stop is not null) return byCoord.stop;
        }

        // 2. Name match — only valid if coords agree (or one side has no coords)
        var chaloNorm = NormalizeStopName(chaloName);

        bool NameMatches(Stop s)
        {
            var dbNorm = NormalizeStopName(s.StopName);
            return string.Equals(dbNorm, chaloNorm, StringComparison.OrdinalIgnoreCase)
                || (chaloNorm.Length >= 5 && dbNorm.Length >= 5 &&
                    (dbNorm.Contains(chaloNorm, StringComparison.OrdinalIgnoreCase) ||
                     chaloNorm.Contains(dbNorm, StringComparison.OrdinalIgnoreCase)));
        }

        foreach (var s in stops.Where(NameMatches))
        {
            // If both sides have coordinates, reject if they are more than 500m apart
            if (chaloHasCoords && s.Latitude.HasValue && s.Longitude.HasValue)
            {
                var dist = Haversine(lat, lon, s.Latitude.Value, s.Longitude.Value);
                if (dist > 0.5) continue;   // same name, different place — skip
            }
            return s;
        }

        return null;
    }

    private static readonly string[] NoiseWords =
        ["BUS STAND", "BUS DEPOT", "BUS TERMINUS", "BUS STOP", "TERMINUS",
         "DEPOT", "JUNCTION", "JN", "JN.", "METRO", "STATION",
         "WEST", "EAST", "NORTH", "SOUTH", "HEAD POST OFFICE",
         "POST OFFICE", "INTERNATIONAL AIRPORT", "NATIONAL AIRPORT"];

    private static string NormalizeStopName(string name)
    {
        var n = name.Trim().ToUpperInvariant();
        foreach (var noise in NoiseWords)
            n = n.Replace(noise, "", StringComparison.OrdinalIgnoreCase);
        // Collapse multiple spaces and strip punctuation
        n = System.Text.RegularExpressions.Regex.Replace(n, @"[^A-Z0-9 ]", "");
        n = System.Text.RegularExpressions.Regex.Replace(n, @"\s+", " ").Trim();
        return n;
    }

    private static int FuzzyContains(string? a, string? b)
    {
        if (a is null || b is null) return 0;
        var aNorm = a.ToUpperInvariant();
        var bNorm = b.ToUpperInvariant();
        return bNorm.Split(' ').Count(w => w.Length > 3 && aNorm.Contains(w)) > 0 ? 1 : 0;
    }

    // Richer similarity: counts matching significant words in both directions
    private static int NameSimilarity(string? a, string? b)
    {
        if (a is null || b is null) return 0;
        var aNorm = NormalizeStopName(a);
        var bNorm = NormalizeStopName(b);
        if (string.Equals(aNorm, bNorm, StringComparison.OrdinalIgnoreCase)) return 10;
        var aWords = aNorm.Split(' ', StringSplitOptions.RemoveEmptyEntries).Where(w => w.Length > 3).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var bWords = bNorm.Split(' ', StringSplitOptions.RemoveEmptyEntries).Where(w => w.Length > 3);
        return bWords.Count(w => aWords.Contains(w));
    }

    private static double Haversine(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371;
        double dLat = (lat2 - lat1) * Math.PI / 180;
        double dLon = (lon2 - lon1) * Math.PI / 180;
        double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
            + Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180)
            * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    private static string GenerateStopCode(string name, int index)
    {
        var words = name.Trim().ToUpperInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var prefix = string.Concat(words.Take(3).Select(w => w[0]));
        prefix = prefix.PadRight(3, 'X')[..3];
        return $"{prefix}-{index:D5}";
    }

    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };
}

// ── Chalo API DTOs ────────────────────────────────────────────────────────

public class ChaloSearchResult
{
    [JsonPropertyName("routes")]
    public List<ChaloRouteRef> Routes { get; set; } = [];
}

public class ChaloRouteRef
{
    [JsonPropertyName("route_id")]         public string RouteId          { get; set; } = "";
    [JsonPropertyName("route_name")]        public string RouteName        { get; set; } = "";
    [JsonPropertyName("first_stop_name")]   public string FirstStopName    { get; set; } = "";
    [JsonPropertyName("last_stop_name")]    public string LastStopName     { get; set; } = "";
    [JsonPropertyName("direction_stop_name")] public string DirectionStopName { get; set; } = "";
}

public class ChaloRouteDetail
{
    [JsonPropertyName("route")]
    public ChaloRouteBody? Route { get; set; }
}

public class ChaloRouteBody
{
    [JsonPropertyName("stopSequenceWithDetails")]
    public List<ChaloStop> StopSequence { get; set; } = [];
}

public class ChaloStop
{
    [JsonPropertyName("stop_name")] public string StopName { get; set; } = "";
    [JsonPropertyName("stop_lat")]  public double Lat      { get; set; }
    [JsonPropertyName("stop_lon")]  public double Lon      { get; set; }
}
