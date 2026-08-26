using BusManagement.API.Data;
using BusManagement.API.Models;
using BusManagement.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BusManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TranslationController(
    BusManagementDbContext db,
    TamilTransliterationService transliterator) : ControllerBase
{
    private const string LangCode = "ta";

    // POST api/translation/stops
    // Transliterates all stops that don't yet have a Tamil translation.
    [HttpPost("stops")]
    public async Task<IActionResult> TranslateStops()
    {
        var untranslated = await db.Stops
            .Where(s => !db.StopTranslations
                .Any(t => t.StopId == s.StopId && t.LanguageCode == LangCode))
            .Select(s => new { s.StopId, s.StopName, s.ShortName })
            .ToListAsync();

        if (untranslated.Count == 0)
            return Ok(new { translated = 0, message = "All stops already have Tamil translations." });

        var translations = untranslated.Select(s => new StopTranslation
        {
            StopId = s.StopId,
            LanguageCode = LangCode,
            TranslatedName = transliterator.TransliteratePhrase(s.StopName),
            TranslatedShortName = s.ShortName is not null
                ? transliterator.TransliteratePhrase(s.ShortName)
                : null,
        }).ToList();

        db.StopTranslations.AddRange(translations);
        await db.SaveChangesAsync();

        return Ok(new
        {
            translated = translations.Count,
            message = $"{translations.Count} stop(s) transliterated to Tamil.",
            samples = translations.Take(5).Select(t => new
            {
                t.StopId,
                t.TranslatedName,
                t.TranslatedShortName,
            }),
        });
    }

    // POST api/translation/stops/{id}
    // Saves (or updates) the Tamil translation for a single stop.
    [HttpPost("stops/{id:int}")]
    public async Task<IActionResult> TranslateStop(int id, [FromBody] TranslateStopRequest? body)
    {
        var stop = await db.Stops.FindAsync(id);
        if (stop is null) return NotFound(new { message = $"Stop {id} not found." });

        var translatedName = body?.TranslatedName is { Length: > 0 } custom
            ? custom
            : transliterator.TransliteratePhrase(stop.StopName);

        var translatedShortName = body?.TranslatedShortName is { Length: > 0 } customShort
            ? customShort
            : stop.ShortName is not null ? transliterator.TransliteratePhrase(stop.ShortName) : null;

        var existing = await db.StopTranslations
            .FirstOrDefaultAsync(t => t.StopId == id && t.LanguageCode == LangCode);

        if (existing is not null)
        {
            existing.TranslatedName = translatedName;
            existing.TranslatedShortName = translatedShortName;
        }
        else
        {
            db.StopTranslations.Add(new StopTranslation
            {
                StopId = id,
                LanguageCode = LangCode,
                TranslatedName = translatedName,
                TranslatedShortName = translatedShortName,
            });
        }

        await db.SaveChangesAsync();

        return Ok(new
        {
            stopId = id,
            originalName = stop.StopName,
            originalShortName = stop.ShortName,
            translatedName,
            translatedShortName,
            languageCode = LangCode,
        });
    }

    // GET api/translation/stops/{id}
    // Returns the current Tamil translation for a stop, or null if none.
    [HttpGet("stops/{id:int}")]
    public async Task<IActionResult> GetStopTranslation(int id)
    {
        var stop = await db.Stops.FindAsync(id);
        if (stop is null) return NotFound(new { message = $"Stop {id} not found." });

        var t = await db.StopTranslations
            .FirstOrDefaultAsync(x => x.StopId == id && x.LanguageCode == LangCode);

        return Ok(new
        {
            stopId = id,
            originalName = stop.StopName,
            originalShortName = stop.ShortName,
            translatedName = t?.TranslatedName,
            translatedShortName = t?.TranslatedShortName,
        });
    }

    // GET api/translation/stages/{id}
    // Returns the current Tamil translation for a stage, or null if none.
    [HttpGet("stages/{id:int}")]
    public async Task<IActionResult> GetStageTranslation(int id)
    {
        var stage = await db.RouteStages.FindAsync(id);
        if (stage is null) return NotFound(new { message = $"Stage {id} not found." });

        var t = await db.StageTranslations
            .FirstOrDefaultAsync(x => x.RouteStageId == id && x.LanguageCode == LangCode);

        return Ok(new
        {
            routeStageId = id,
            originalName = stage.StageName,
            translatedName = t?.TranslatedName,
        });
    }

    // POST api/translation/stages/{id}
    // Saves (or updates) the Tamil translation for a single stage.
    [HttpPost("stages/{id:int}")]
    public async Task<IActionResult> TranslateStage(int id, [FromBody] TranslateStageRequest? body)
    {
        var stage = await db.RouteStages.FindAsync(id);
        if (stage is null) return NotFound(new { message = $"Stage {id} not found." });

        var translatedName = body?.TranslatedName is { Length: > 0 } custom
            ? custom
            : transliterator.TransliteratePhrase(stage.StageName);

        var existing = await db.StageTranslations
            .FirstOrDefaultAsync(t => t.RouteStageId == id && t.LanguageCode == LangCode);

        if (existing is not null)
            existing.TranslatedName = translatedName;
        else
            db.StageTranslations.Add(new StageTranslation
            {
                RouteStageId = id,
                LanguageCode = LangCode,
                TranslatedName = translatedName,
            });

        await db.SaveChangesAsync();

        return Ok(new
        {
            routeStageId = id,
            originalName = stage.StageName,
            translatedName,
            languageCode = LangCode,
        });
    }

    // POST api/translation/stages
    // Transliterates all route stages that don't yet have a Tamil translation.
    [HttpPost("stages")]
    public async Task<IActionResult> TranslateStages()
    {
        var untranslated = await db.RouteStages
            .Where(s => !db.StageTranslations
                .Any(t => t.RouteStageId == s.RouteStageId && t.LanguageCode == LangCode))
            .Select(s => new { s.RouteStageId, s.StageName })
            .ToListAsync();

        if (untranslated.Count == 0)
            return Ok(new { translated = 0, message = "All stages already have Tamil translations." });

        var translations = untranslated.Select(s => new StageTranslation
        {
            RouteStageId = s.RouteStageId,
            LanguageCode = LangCode,
            TranslatedName = transliterator.TransliteratePhrase(s.StageName),
        }).ToList();

        db.StageTranslations.AddRange(translations);
        await db.SaveChangesAsync();

        return Ok(new
        {
            translated = translations.Count,
            message = $"{translations.Count} stage(s) transliterated to Tamil.",
            samples = translations.Take(5).Select(t => new
            {
                t.RouteStageId,
                t.TranslatedName,
            }),
        });
    }
}

public record TranslateStopRequest(string? TranslatedName, string? TranslatedShortName);
public record TranslateStageRequest(string? TranslatedName);
