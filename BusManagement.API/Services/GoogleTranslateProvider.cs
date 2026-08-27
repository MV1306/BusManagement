using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace BusManagement.API.Services;

/// <summary>
/// Translation provider backed by Google Cloud Translation API v2.
/// Requires Translation:Google:ApiKey in appsettings.
/// </summary>
public class GoogleTranslateProvider(HttpClient http, IConfiguration config) : ITranslationProvider
{
    private const string Endpoint = "https://translation.googleapis.com/language/translate/v2";

    public async Task<string> TranslateAsync(string text, string targetLanguage, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text)) return text;

        var apiKey = config["Translation:Google:ApiKey"]
            ?? throw new InvalidOperationException("Translation:Google:ApiKey is not configured.");

        var payload = new { q = text, target = targetLanguage, format = "text", source = "en" };

        var response = await http.PostAsJsonAsync($"{Endpoint}?key={apiKey}", payload, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<GoogleTranslateResponse>(cancellationToken: ct);
        return result?.Data?.Translations?.FirstOrDefault()?.TranslatedText ?? text;
    }

    private sealed class GoogleTranslateResponse
    {
        [JsonPropertyName("data")]
        public GoogleTranslateData? Data { get; set; }
    }

    private sealed class GoogleTranslateData
    {
        [JsonPropertyName("translations")]
        public List<GoogleTranslation>? Translations { get; set; }
    }

    private sealed class GoogleTranslation
    {
        [JsonPropertyName("translatedText")]
        public string? TranslatedText { get; set; }
    }
}
