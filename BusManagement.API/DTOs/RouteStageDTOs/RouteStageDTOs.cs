namespace BusManagement.API.DTOs.RouteStageDTOs;

public record RouteStageResponse(int RouteStageId, string StageName, int StageOrder,
    double? DistanceFromPreviousKm, bool IsFirstStage, bool IsLastStage);

public record AddRouteStageRequest(string StageName, int StageOrder, double? DistanceFromPreviousKm);

public record UpdateRouteStageRequest(string StageName, int StageOrder, double? DistanceFromPreviousKm);

public record ReorderRouteStagesRequest(List<StageOrderItem> Stages);

public record StageOrderItem(int RouteStageId, int StageOrder);
