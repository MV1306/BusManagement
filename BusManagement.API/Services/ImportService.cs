using BusManagement.API.Data;
using BusManagement.API.DTOs.ImportDTOs;
using BusManagement.API.Models;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;

namespace BusManagement.API.Services;

public class ImportService(BusManagementDbContext db)
{
    public async Task<ImportResult> ImportStopsAsync(IFormFile file)
    {
        int imported = 0, skipped = 0;
        var errors = new List<ImportError>();

        using var workbook = new XLWorkbook(file.OpenReadStream());
        var sheet = workbook.Worksheet(1);
        var rows = sheet.RowsUsed().Skip(1).ToList();

        var existingCodes = (await db.Stops.Select(s => s.StopCode).ToListAsync()).ToHashSet();

        foreach (var row in rows)
        {
            int rowNum = row.RowNumber();
            try
            {
                string stopCode = row.Cell(1).GetString().Trim().ToUpper();
                string stopName = row.Cell(2).GetString().Trim().ToUpper();

                if (string.IsNullOrEmpty(stopCode) || string.IsNullOrEmpty(stopName))
                {
                    errors.Add(new ImportError(rowNum, "StopCode and StopName are required."));
                    skipped++;
                    continue;
                }

                if (existingCodes.Contains(stopCode))
                {
                    errors.Add(new ImportError(rowNum, $"StopCode '{stopCode}' already exists."));
                    skipped++;
                    continue;
                }

                double? lat = null, lng = null;
                if (!row.Cell(3).IsEmpty())
                {
                    var parts = row.Cell(3).GetString().Split(',');
                    if (parts.Length == 2 &&
                        double.TryParse(parts[0].Trim(), out double parsedLat) &&
                        double.TryParse(parts[1].Trim(), out double parsedLng))
                    {
                        lat = parsedLat;
                        lng = parsedLng;
                    }
                    else
                    {
                        errors.Add(new ImportError(rowNum, $"LatLong '{row.Cell(3).GetString()}' is invalid. Expected format: 13.0827, 80.2707"));
                        skipped++;
                        continue;
                    }
                }
                string? shortName = row.Cell(4).IsEmpty() ? null : row.Cell(4).GetString().Trim().ToUpper();

                db.Stops.Add(new Stop
                {
                    StopCode = stopCode,
                    StopName = stopName,
                    ShortName = shortName,
                    Latitude = lat,
                    Longitude = lng
                });

                existingCodes.Add(stopCode);
                imported++;
            }
            catch (Exception ex)
            {
                errors.Add(new ImportError(rowNum, ex.Message));
                skipped++;
            }
        }

        await db.SaveChangesAsync();
        return new ImportResult(imported, skipped, errors.Count, errors);
    }

    public async Task<ImportResult> ImportRoutesAsync(IFormFile file)
    {
        int imported = 0, skipped = 0;
        var errors = new List<ImportError>();

        using var workbook = new XLWorkbook(file.OpenReadStream());

        // Sheet 1 — Routes
        var routeSheet = workbook.Worksheet(1);
        var routeRows = routeSheet.RowsUsed().Skip(1).ToList();
        var existingCodes = (await db.Routes.Select(r => r.RouteCode).ToListAsync()).ToHashSet();

        foreach (var row in routeRows)
        {
            int rowNum = row.RowNumber();
            try
            {
                string routeCode = row.Cell(1).GetString().Trim().ToUpper();
                string routeName = row.Cell(2).GetString().Trim().ToUpper();

                if (string.IsNullOrEmpty(routeCode) || string.IsNullOrEmpty(routeName))
                {
                    errors.Add(new ImportError(rowNum, "[Routes] RouteCode and RouteName are required."));
                    skipped++;
                    continue;
                }

                if (existingCodes.Contains(routeCode))
                {
                    errors.Add(new ImportError(rowNum, $"[Routes] RouteCode '{routeCode}' already exists."));
                    skipped++;
                    continue;
                }

                db.Routes.Add(new Models.Route { RouteCode = routeCode, RouteName = routeName });
                existingCodes.Add(routeCode);
                imported++;
            }
            catch (Exception ex)
            {
                errors.Add(new ImportError(rowNum, $"[Routes] {ex.Message}"));
                skipped++;
            }
        }

        // Save routes first so route-stop mapping can resolve them
        await db.SaveChangesAsync();

        // Sheet 2 — RouteStages (StageName, StageOrder, DistanceFromPreviousKm)
        if (workbook.Worksheets.Count >= 2)
        {
            var stageSheet = workbook.Worksheet(2);
            var stageRows = stageSheet.RowsUsed().Skip(1).ToList();

            var routeMap = await db.Routes.ToDictionaryAsync(r => r.RouteCode.ToUpper(), r => r.RouteId);
            var existingStageSet = (await db.RouteStages
                .Select(rs => new { rs.RouteId, rs.StageOrder })
                .ToListAsync())
                .Select(x => (x.RouteId, x.StageOrder)).ToHashSet();

            foreach (var row in stageRows)
            {
                int rowNum = row.RowNumber();
                try
                {
                    string routeCode = row.Cell(1).GetString().Trim().ToUpper();
                    string stageName = row.Cell(2).GetString().Trim();
                    int stageOrder = (int)row.Cell(3).GetDouble();
                    double? distFromPrev = row.Cell(4).IsEmpty() ? null : row.Cell(4).GetDouble();

                    if (string.IsNullOrEmpty(routeCode) || string.IsNullOrEmpty(stageName))
                    {
                        errors.Add(new ImportError(rowNum, "[RouteStages] RouteCode and StageName are required."));
                        skipped++;
                        continue;
                    }

                    if (!routeMap.TryGetValue(routeCode, out int routeId))
                    {
                        errors.Add(new ImportError(rowNum, $"[RouteStages] Route '{routeCode}' not found."));
                        skipped++;
                        continue;
                    }

                    if (existingStageSet.Contains((routeId, stageOrder)))
                    {
                        errors.Add(new ImportError(rowNum, $"[RouteStages] Route '{routeCode}' already has a stage at order {stageOrder}."));
                        skipped++;
                        continue;
                    }

                    db.RouteStages.Add(new RouteStage
                    {
                        RouteId = routeId,
                        StageName = stageName,
                        StageOrder = stageOrder,
                        DistanceFromPreviousKm = distFromPrev
                    });

                    existingStageSet.Add((routeId, stageOrder));
                    imported++;
                }
                catch (Exception ex)
                {
                    errors.Add(new ImportError(rowNum, $"[RouteStages] {ex.Message}"));
                    skipped++;
                }
            }

            await db.SaveChangesAsync();
        }

        return new ImportResult(imported, skipped, errors.Count, errors);
    }

    public async Task<ImportResult> ImportStopTranslationsAsync(IFormFile file)
    {
        int imported = 0, skipped = 0;
        var errors = new List<ImportError>();

        using var workbook = new XLWorkbook(file.OpenReadStream());
        var sheet = workbook.Worksheet(1);
        var rows = sheet.RowsUsed().Skip(1).ToList();

        var stopMap = await db.Stops.ToDictionaryAsync(s => s.StopId, s => s);
        const string lang = "ta";

        foreach (var row in rows)
        {
            int rowNum = row.RowNumber();
            try
            {
                if (!int.TryParse(row.Cell(1).GetString().Trim(), out int stopId))
                {
                    errors.Add(new ImportError(rowNum, "Invalid StopId."));
                    skipped++; continue;
                }
                string translatedName = row.Cell(3).GetString().Trim();
                string? translatedShortName = row.Cell(4).IsEmpty() ? null : row.Cell(4).GetString().Trim();

                if (string.IsNullOrEmpty(translatedName))
                {
                    errors.Add(new ImportError(rowNum, "TranslatedName is required."));
                    skipped++; continue;
                }

                if (!stopMap.ContainsKey(stopId))
                {
                    errors.Add(new ImportError(rowNum, $"Stop {stopId} not found."));
                    skipped++; continue;
                }

                var existing = await db.StopTranslations
                    .FirstOrDefaultAsync(t => t.StopId == stopId && t.LanguageCode == lang);

                if (existing is not null)
                {
                    existing.TranslatedName = translatedName;
                    existing.TranslatedShortName = translatedShortName;
                }
                else
                {
                    db.StopTranslations.Add(new Models.StopTranslation
                    {
                        StopId = stopId,
                        LanguageCode = lang,
                        TranslatedName = translatedName,
                        TranslatedShortName = translatedShortName,
                    });
                }
                imported++;
            }
            catch (Exception ex)
            {
                errors.Add(new ImportError(rowNum, ex.Message));
                skipped++;
            }
        }

        await db.SaveChangesAsync();
        return new ImportResult(imported, skipped, errors.Count, errors);
    }

    public async Task<ImportResult> ImportStageTranslationsAsync(IFormFile file)
    {
        int imported = 0, skipped = 0;
        var errors = new List<ImportError>();

        using var workbook = new XLWorkbook(file.OpenReadStream());
        var sheet = workbook.Worksheet(1);
        var rows = sheet.RowsUsed().Skip(1).ToList();

        var stageMap = await db.RouteStages.ToDictionaryAsync(s => s.RouteStageId, s => s);
        const string lang = "ta";

        foreach (var row in rows)
        {
            int rowNum = row.RowNumber();
            try
            {
                if (!int.TryParse(row.Cell(1).GetString().Trim(), out int stageId))
                {
                    errors.Add(new ImportError(rowNum, "Invalid RouteStageId."));
                    skipped++; continue;
                }
                string translatedName = row.Cell(3).GetString().Trim();

                if (string.IsNullOrEmpty(translatedName))
                {
                    errors.Add(new ImportError(rowNum, "TranslatedName is required."));
                    skipped++; continue;
                }

                if (!stageMap.ContainsKey(stageId))
                {
                    errors.Add(new ImportError(rowNum, $"Stage {stageId} not found."));
                    skipped++; continue;
                }

                var existing = await db.StageTranslations
                    .FirstOrDefaultAsync(t => t.RouteStageId == stageId && t.LanguageCode == lang);

                if (existing is not null)
                    existing.TranslatedName = translatedName;
                else
                    db.StageTranslations.Add(new Models.StageTranslation
                    {
                        RouteStageId = stageId,
                        LanguageCode = lang,
                        TranslatedName = translatedName,
                    });

                imported++;
            }
            catch (Exception ex)
            {
                errors.Add(new ImportError(rowNum, ex.Message));
                skipped++;
            }
        }

        await db.SaveChangesAsync();
        return new ImportResult(imported, skipped, errors.Count, errors);
    }

    public async Task<ImportResult> ImportFaresAsync(IFormFile file)
    {
        int imported = 0, skipped = 0;
        var errors = new List<ImportError>();

        using var workbook = new XLWorkbook(file.OpenReadStream());
        var sheet = workbook.Worksheet(1);
        var rows = sheet.RowsUsed().Skip(1).ToList();

        var existing = (await db.Fares
            .Select(f => new { f.BusType, f.Stages })
            .ToListAsync())
            .Select(x => (x.BusType, x.Stages)).ToHashSet();

        foreach (var row in rows)
        {
            int rowNum = row.RowNumber();
            try
            {
                string busTypeStr = row.Cell(1).GetString().Trim();
                int stages = (int)row.Cell(2).GetDouble();
                decimal fareAmount = (decimal)row.Cell(3).GetDouble();

                if (!Enum.TryParse<BusType>(busTypeStr, true, out var busType))
                {
                    errors.Add(new ImportError(rowNum, $"Invalid BusType '{busTypeStr}'."));
                    skipped++;
                    continue;
                }

                if (existing.Contains((busType, stages)))
                {
                    errors.Add(new ImportError(rowNum, $"Fare for {busType} stage {stages} already exists."));
                    skipped++;
                    continue;
                }

                db.Fares.Add(new Fare { BusType = busType, Stages = stages, FareAmount = fareAmount });
                existing.Add((busType, stages));
                imported++;
            }
            catch (Exception ex)
            {
                errors.Add(new ImportError(rowNum, ex.Message));
                skipped++;
            }
        }

        await db.SaveChangesAsync();
        return new ImportResult(imported, skipped, errors.Count, errors);
    }
}
