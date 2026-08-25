using BusManagement.API.Data;
using BusManagement.API.DTOs.FareDTOs;
using BusManagement.API.Models;
using Microsoft.EntityFrameworkCore;

namespace BusManagement.API.Services;

public class FareService(BusManagementDbContext db)
{
    public async Task<List<FareAuditLogResponse>> GetAuditLogsAsync(int page, int pageSize) =>
        await db.FareAuditLogs
            .OrderByDescending(a => a.ChangedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new FareAuditLogResponse(
                a.AuditId, a.FareId, a.BusType, a.Stages,
                a.OldAmount, a.NewAmount, a.Action, a.ChangedBy, a.ChangedAt))
            .ToListAsync();

    public async Task<List<FareResponse>> GetAllAsync() =>
        await db.Fares.Select(f => ToResponse(f)).ToListAsync();

    public async Task<FareResponse?> GetByIdAsync(int id) =>
        await db.Fares.Where(f => f.FareId == id).Select(f => ToResponse(f)).FirstOrDefaultAsync();

    public async Task<List<FareResponse>> GetByBusTypeAsync(BusType busType) =>
        await db.Fares
            .Where(f => f.BusType == busType)
            .OrderBy(f => f.Stages)
            .Select(f => ToResponse(f))
            .ToListAsync();

    public async Task<FareResponse> CreateAsync(CreateFareRequest req)
    {
        var fare = new Fare { BusType = req.BusType, Stages = req.Stages, FareAmount = req.FareAmount };
        db.Fares.Add(fare);
        await db.SaveChangesAsync();
        db.FareAuditLogs.Add(new FareAuditLog
        {
            FareId = fare.FareId, BusType = fare.BusType, Stages = fare.Stages,
            NewAmount = fare.FareAmount, Action = "Created", ChangedBy = req.ChangedBy
        });
        await db.SaveChangesAsync();
        return ToResponse(fare);
    }

    public async Task<FareResponse?> UpdateAsync(int id, UpdateFareRequest req)
    {
        var fare = await db.Fares.FindAsync(id);
        if (fare is null) return null;
        var oldAmount = fare.FareAmount;
        fare.FareAmount = req.FareAmount;
        fare.IsActive = req.IsActive;
        db.FareAuditLogs.Add(new FareAuditLog
        {
            FareId = fare.FareId, BusType = fare.BusType, Stages = fare.Stages,
            OldAmount = oldAmount, NewAmount = req.FareAmount, Action = "Updated", ChangedBy = req.ChangedBy
        });
        await db.SaveChangesAsync();
        return ToResponse(fare);
    }

    public async Task<bool> DeleteAsync(int id, string? deletedBy = null)
    {
        var fare = await db.Fares.FindAsync(id);
        if (fare is null) return false;
        db.FareAuditLogs.Add(new FareAuditLog
        {
            FareId = fare.FareId, BusType = fare.BusType, Stages = fare.Stages,
            OldAmount = fare.FareAmount, Action = "Deleted", ChangedBy = deletedBy
        });
        db.Fares.Remove(fare);
        await db.SaveChangesAsync();
        return true;
    }

    private static FareResponse ToResponse(Fare f) =>
        new(f.FareId, f.BusType, f.Stages, f.FareAmount, f.IsActive);
}
