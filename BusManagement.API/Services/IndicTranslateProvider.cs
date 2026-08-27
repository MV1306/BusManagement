using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace BusManagement.API.Services;

/// <summary>
/// Translation provider backed by the local IndicTrans2 FastAPI microservice.
/// Batches single calls but also supports direct batch use from bulk endpoints.
/// Configure Translation:IndicTrans2:Url in appsettings (default: http://localhost:5100).
/// </summary>
public class IndicTranslateProvider(HttpClient http) : ITranslationProvider
{
    public async Task<string> TranslateAsync(string text, string targetLanguage, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text)) return text;

        var results = await TranslateBatchAsync([text], targetLanguage, ct);
        return results.Count > 0 ? results[0] : text;
    }

    public async Task<List<string>> TranslateBatchAsync(
        IReadOnlyList<string> texts,
        string targetLanguage,
        CancellationToken ct = default)
    {
        if (texts.Count == 0) return [];

        var payload = new { texts, target_language = targetLanguage };
        var response = await http.PostAsJsonAsync("/translate", payload, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<IndicTranslateResponse>(cancellationToken: ct);
        return result?.Translations ?? texts.ToList();
    }

    private sealed class IndicTranslateResponse
    {
        [JsonPropertyName("translations")]
        public List<string>? Translations { get; set; }
    }
}
