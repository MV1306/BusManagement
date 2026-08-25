using System.IO.Compression;
using System.Text;
using BusManagement.API.Data;
using Microsoft.EntityFrameworkCore;

namespace BusManagement.API.Services;

public class GtfsExportService(BusManagementDbContext db)
{
    public async Task<byte[]> ExportAsync()
    {
        var stops = await db.Stops.Where(s => s.IsActive).OrderBy(s => s.StopId).ToListAsync();
        var routes = await db.Routes.Where(r => r.IsActive).OrderBy(r => r.RouteId).ToListAsync();
        var routeStops = await db.RouteStops
            .Include(rs => rs.Stop)
            .OrderBy(rs => rs.RouteId).ThenBy(rs => rs.StopOrder)
            .ToListAsync();
        var fares = await db.Fares.Where(f => f.IsActive).ToListAsync();

        using var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            WriteEntry(zip, "stops.txt", BuildStops(stops));
            WriteEntry(zip, "routes.txt", BuildRoutes(routes));
            WriteEntry(zip, "trips.txt", BuildTrips(routes));
            WriteEntry(zip, "stop_times.txt", BuildStopTimes(routeStops));
            WriteEntry(zip, "fare_attributes.txt", BuildFareAttributes(fares));
            WriteEntry(zip, "fare_rules.txt", BuildFareRules(routes, fares));
        }
        return ms.ToArray();
    }

    private static void WriteEntry(ZipArchive zip, string name, string content)
    {
        var entry = zip.CreateEntry(name);
        using var writer = new StreamWriter(entry.Open(), Encoding.UTF8);
        writer.Write(content);
    }

    private static string BuildStops(IEnumerable<Models.Stop> stops)
    {
        var sb = new StringBuilder("stop_id,stop_code,stop_name,stop_lat,stop_lon\n");
        foreach (var s in stops)
            sb.AppendLine($"{s.StopId},{s.StopCode},{Escape(s.StopName)},{s.Latitude ?? 0},{s.Longitude ?? 0}");
        return sb.ToString();
    }

    private static string BuildRoutes(IEnumerable<Models.Route> routes)
    {
        var sb = new StringBuilder("route_id,route_short_name,route_long_name,route_type\n");
        foreach (var r in routes)
            sb.AppendLine($"{r.RouteId},{r.RouteCode},{Escape(r.RouteName)},3");
        return sb.ToString();
    }

    private static string BuildTrips(IEnumerable<Models.Route> routes)
    {
        var sb = new StringBuilder("route_id,service_id,trip_id\n");
        foreach (var r in routes)
            sb.AppendLine($"{r.RouteId},1,trip_{r.RouteId}");
        return sb.ToString();
    }

    private static string BuildStopTimes(IEnumerable<Models.RouteStop> routeStops)
    {
        var sb = new StringBuilder("trip_id,arrival_time,departure_time,stop_id,stop_sequence\n");
        var grouped = routeStops.GroupBy(rs => rs.RouteId);
        foreach (var group in grouped)
        {
            double cumulativeMinutes = 0;
            foreach (var rs in group)
            {
                cumulativeMinutes += rs.DistanceFromPreviousKm * 3 + 1;
                var time = TimeSpan.FromMinutes(cumulativeMinutes);
                var t = $"{(int)time.TotalHours:D2}:{time.Minutes:D2}:{time.Seconds:D2}";
                sb.AppendLine($"trip_{rs.RouteId},{t},{t},{rs.StopId},{rs.StopOrder}");
            }
        }
        return sb.ToString();
    }

    private static string BuildFareAttributes(IEnumerable<Models.Fare> fares)
    {
        var sb = new StringBuilder("fare_id,price,currency_type,payment_method,transfers\n");
        foreach (var f in fares)
            sb.AppendLine($"fare_{f.FareId},{f.FareAmount},INR,0,0");
        return sb.ToString();
    }

    private static string BuildFareRules(IEnumerable<Models.Route> routes, IEnumerable<Models.Fare> fares)
    {
        var sb = new StringBuilder("fare_id,route_id\n");
        // Associate the lowest-stage fare of each bus type with all routes as a default
        var defaultFare = fares.OrderBy(f => f.Stages).FirstOrDefault();
        if (defaultFare is not null)
            foreach (var r in routes)
                sb.AppendLine($"fare_{defaultFare.FareId},{r.RouteId}");
        return sb.ToString();
    }

    private static string Escape(string value) =>
        value.Contains(',') ? $"\"{value}\"" : value;
}
