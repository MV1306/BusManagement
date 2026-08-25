using BusManagement.API.Data;
using BusManagement.API.DTOs;
using BusManagement.API.DTOs.StopDTOs;
using BusManagement.API.Models;
using Microsoft.EntityFrameworkCore;

namespace BusManagement.API.Services;

public class StopService(BusManagementDbContext db)
{
    public async Task<PagedResult<StopResponse>> GetAllAsync(int page, int pageSize, string? search = null)
    {
        var query = db.Stops
            .Where(s => search == null || EF.Functions.ILike(s.StopName, $"%{search}%") || EF.Functions.ILike(s.StopCode, $"%{search}%") || (s.ShortName != null && EF.Functions.ILike(s.ShortName, $"%{search}%")))
            .OrderBy(s => s.StopName);
        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => ToResponse(s))
            .ToListAsync();
        return new PagedResult<StopResponse>(items, total, page, pageSize);
    }

    public async Task<StopResponse?> GetByIdAsync(int id) =>
        await db.Stops.Where(s => s.StopId == id).Select(s => ToResponse(s)).FirstOrDefaultAsync();

    public async Task<StopResponse> CreateAsync(CreateStopRequest req)
    {
        var stop = new Stop
        {
            StopCode = req.StopCode,
            StopName = req.StopName,
            ShortName = req.ShortName,
            Latitude = req.Latitude,
            Longitude = req.Longitude,
            CreatedBy = req.CreatedBy
        };
        db.Stops.Add(stop);
        await db.SaveChangesAsync();
        return ToResponse(stop);
    }

    public async Task<StopResponse?> UpdateAsync(int id, UpdateStopRequest req)
    {
        var stop = await db.Stops.FindAsync(id);
        if (stop is null)
            return null;
        stop.StopCode = req.StopCode;
        stop.StopName = req.StopName;
        stop.ShortName = req.ShortName;
        stop.Latitude = req.Latitude;
        stop.Longitude = req.Longitude;
        stop.IsActive = req.IsActive;
        stop.ModifiedBy = req.ModifiedBy;
        stop.ModifiedDate = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return ToResponse(stop);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var stop = await db.Stops.FindAsync(id);
        if (stop is null)
            return false;
        db.Stops.Remove(stop);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<MergeStopsResult?> MergeAsync(int keepId, int deleteId)
    {
        if (keepId == deleteId) return null;
        var keep = await db.Stops.FindAsync(keepId);
        var delete = await db.Stops.FindAsync(deleteId);
        if (keep is null || delete is null) return null;

        var affected = await db.RouteStops
            .Where(rs => rs.StopId == deleteId)
            .ToListAsync();

        foreach (var rs in affected)
            rs.StopId = keepId;

        db.Stops.Remove(delete);
        await db.SaveChangesAsync();
        return new MergeStopsResult(keepId, deleteId, affected.Count);
    }

    public async Task<List<NearbyStopResponse>> GetNearbyAsync(double lat, double lng, double radiusKm)
    {
        var stops = await db.Stops
            .Where(s => s.IsActive && s.Latitude != null && s.Longitude != null)
            .ToListAsync();

        return stops
            .Select(s => (stop: s, dist: Haversine(lat, lng, s.Latitude!.Value, s.Longitude!.Value)))
            .Where(x => x.dist <= radiusKm)
            .OrderBy(x => x.dist)
            .Select(x => new NearbyStopResponse(
                x.stop.StopId, x.stop.StopCode, x.stop.StopName, x.stop.ShortName,
                x.stop.Latitude, x.stop.Longitude, x.stop.IsActive,
                Math.Round(x.dist, 2)))
            .ToList();
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

    private static StopResponse ToResponse(Stop s) =>
        new(s.StopId, s.StopCode, s.StopName, s.ShortName, s.Latitude, s.Longitude, s.IsActive);
}
