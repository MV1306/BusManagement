using BusManagement.API.Models;

namespace BusManagement.API.DTOs.FareDTOs;

public record FareResponse(int FareId, BusType BusType, int Stages, decimal FareAmount, bool IsActive);

public record CreateFareRequest(BusType BusType, int Stages, decimal FareAmount, string? ChangedBy = null);

public record UpdateFareRequest(decimal FareAmount, bool IsActive, string? ChangedBy = null);

public record FareAuditLogResponse(
    int AuditId, int FareId, BusType BusType, int Stages,
    decimal? OldAmount, decimal? NewAmount, string Action,
    string? ChangedBy, DateTime ChangedAt);

public record FareCalculationResponse(
    string RouteCode,
    BusType BusType,
    string FromStop,
    string ToStop,
    int Stages,
    int TotalStops,
    double DistanceKm,
    decimal Fare);

public record FareByTypeResult(BusType BusType, int Stages, int TotalStops, double DistanceKm, decimal Fare);

public record FareAllTypesResponse(
    string RouteCode,
    string FromStop,
    string ToStop,
    int Stages,
    int TotalStops,
    double DistanceKm,
    List<FareByTypeResult> Fares);

public record SmartFareSegment(string RouteCode, BusType BusType, string FromStop, string ToStop, int Stages, decimal Fare);

public record SmartFareCalculationResponse(string From, string To, List<SmartFareSegment> Segments, decimal TotalFare);
