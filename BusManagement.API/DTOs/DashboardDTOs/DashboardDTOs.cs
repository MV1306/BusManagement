namespace BusManagement.API.DTOs.DashboardDTOs;

public record DashboardSummary(
    int TotalStops, int ActiveStops, int InactiveStops,
    int TotalRoutes, int ActiveRoutes, int InactiveRoutes,
    int TotalFareEntries, int RoutesWithNoStops, int StopsWithNoCoordinates,
    DateTime? LastImportedAt);
