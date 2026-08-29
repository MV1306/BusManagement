namespace BusManagement.API.DTOs.RouteDTOs;

public record RouteResponse(int RouteId, string RouteCode, string RouteName,
    bool IsActive, string? StartingStop, string? EndingStop);

public record CreateRouteRequest(string RouteCode, string RouteName, string? CreatedBy);

public record UpdateRouteRequest(string RouteCode, string RouteName, bool IsActive, string? ModifiedBy);

public record UpdateRouteStatusRequest(bool IsActive);

public record DuplicateRouteRequest(string NewRouteCode, string NewRouteName);

public record RouteCoverageStop(
    int StopOrder, string StopName, string StopCode,
    double? Latitude, double? Longitude, bool IsFirstStop, bool IsLastStop);

public record RouteCoverageResponse(
    int RouteId, string RouteCode, string RouteName, bool IsActive,
    List<RouteCoverageStop> Stops);

public record RouteCardStop(
    int StopOrder, string StopCode, string StopName,
    double? DistanceFromPreviousKm, double CumulativeDistanceKm,
    bool IsFirstStop, bool IsLastStop);

public record RouteCardFare(string BusType, int Stages, decimal FareAmount);

public record RouteCardResponse(
    string RouteCode, string RouteName, string? StartingStop, string? EndingStop,
    int TotalStops, double TotalDistanceKm, bool IsActive,
    List<RouteCardStop> Stops, List<RouteCardFare> Fares);

public record RouteBusTypeResponse(int RouteBusTypeId, int RouteId, string BusType);

public record SetRouteBusTypesRequest(List<string> BusTypes);
