using BusManagement.API.Models;

namespace BusManagement.API.DTOs.JourneyPlannerDTOs;

public record JourneyLeg(
    string RouteCode,
    string RouteName,
    string BoardAt,
    string AlightAt,
    int Stops,
    double DistanceKm,
    int Stages,
    decimal Fare);

public record JourneyPlanResponse(
    string From,
    string To,
    BusType BusType,
    double TotalDistanceKm,
    int TotalStops,
    int Transfers,
    decimal TotalFare,
    List<JourneyLeg> Legs);
