namespace BusManagement.API.DTOs.DashboardDTOs;

public record DashboardSummary(
    int TotalStops, int ActiveStops, int InactiveStops,
    int TotalRoutes, int ActiveRoutes, int InactiveRoutes,
    int TotalFareEntries, int RoutesWithNoStops, int StopsWithNoCoordinates,
    DateTime? LastImportedAt,
    List<RecentRoute> RecentRoutes,
    List<TopRoute> TopRoutesByStops,
    List<TopRoute> TopRoutesByDistance,
    List<DailyCount> StopsLast7Days);

public record RecentRoute(
    int RouteId, string RouteCode, string RouteName,
    int StopCount, double TotalDistanceKm,
    List<string> BusTypes, DateTime CreatedDate, bool IsActive);

public record TopRoute(
    int RouteId, string RouteCode, string RouteName, int StopCount, double TotalDistanceKm);

public record DailyCount(string Date, int Count);
