namespace BusManagement.API.DTOs.StopDTOs;

public record StopResponse(int StopId, string StopCode, string StopName, string? ShortName,
    double? Latitude, double? Longitude, bool IsActive);

public record CreateStopRequest(string StopCode, string StopName, string? ShortName,
    double? Latitude, double? Longitude, string? CreatedBy);

public record UpdateStopRequest(string StopCode, string StopName, string? ShortName,
    double? Latitude, double? Longitude, bool IsActive, string? ModifiedBy);

public record NearbyStopResponse(
    int StopId, string StopCode, string StopName, string? ShortName,
    double? Latitude, double? Longitude, bool IsActive, double DistanceKm);

public record MergeStopsRequest(int MergeIntoStopId);

public record MergeStopsResult(int KeptStopId, int DeletedStopId, int AffectedRoutes);
