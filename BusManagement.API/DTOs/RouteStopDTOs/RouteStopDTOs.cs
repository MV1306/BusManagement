namespace BusManagement.API.DTOs.RouteStopDTOs;

public record RouteStopResponse(int RouteStopId, int StopId, string StopCode, string StopName,
    double Latitude, double Longitude, int StopOrder, double DistanceFromPreviousKm,
    int RouteStageId, string StageName, bool IsFirstStop, bool IsLastStop);

public record AddRouteStopRequest(int StopId, int RouteStageId, int StopOrder, double DistanceFromPreviousKm);



public record StopOrderItem(int RouteStopId, int StopOrder, double DistanceFromPreviousKm);
