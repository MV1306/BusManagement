namespace BusManagement.API.DTOs.RouteSearchDTOs;

public record StopCoord(string Name, double? Lat, double? Lng, bool IsStageStart);

public record RouteSearchResponse(
    string FromStop,
    string ToStop,
    List<DirectRouteResult> Routes);

public record DirectRouteResult(
    int RouteId,
    string RouteCode,
    string RouteName,
    int BoardingStopOrder,
    int DestinationStopOrder,
    int Stops,
    double DistanceKm,
    decimal? Fare,
    List<string> BusTypes,
    List<string> StageStops,
    List<StopCoord> StopCoords);

public record SmartRouteResponse(
    string From,
    string To,
    double TotalDistanceKm,
    int TotalStops,
    int Transfers,
    List<RouteSegment> Segments);

public record RouteSegment(
    int RouteId,
    string RouteCode,
    string RouteName,
    int FromStopId,
    string FromStop,
    int ToStopId,
    string ToStop,
    int Stops,
    double DistanceKm,
    List<StopCoord> StopCoords);
