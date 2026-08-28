namespace BusManagement.API.Services;

public class GeocodingService(HttpClient httpClient, IConfiguration config)
{
    public async Task<(double Lat, double Lon)?> GeocodeAsync(string stopName)
    {
        var region = config["Geocoding:DefaultRegion"];
        var query = string.IsNullOrWhiteSpace(region) ? stopName : $"{stopName}, {region}";

        var url = $"https://nominatim.openstreetmap.org/search?q={Uri.EscapeDataString(query)}&format=json&limit=1";
        var response = await httpClient.GetFromJsonAsync<NominatimResult[]>(url);

        if (response is null || response.Length == 0) return null;

        return (double.Parse(response[0].Lat), double.Parse(response[0].Lon));
    }

    private record NominatimResult(string Lat, string Lon);
}
