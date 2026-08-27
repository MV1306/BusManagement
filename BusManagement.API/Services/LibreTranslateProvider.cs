using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace BusManagement.API.Services;

/// <summary>
/// Translation provider backed by LibreTranslate (https://libretranslate.com).
/// Works with any self-hosted or public LibreTranslate instance.
/// Set Translation:LibreTranslate:Url and optionally Translation:LibreTranslate:ApiKey in appsettings.
/// </summary>
public class LibreTranslateProvider(HttpClient http, IConfiguration config) : ITranslationProvider
{
    public async Task<string> TranslateAsync(string text, string targetLanguage, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text)) return text;

        var apiKey = config["Translation:LibreTranslate:ApiKey"] ?? "";

        var payload = new
        {
            q = text,
            source = "en",
            target = targetLanguage,
            format = "text",
            api_key = apiKey,
        };

        var response = await http.PostAsJsonAsync("/translate", payload, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<LibreTranslateResponse>(cancellationToken: ct);
        return result?.TranslatedText ?? text;
    }

    private sealed class LibreTranslateResponse
    {
        [JsonPropertyName("translatedText")]
        public string? TranslatedText { get; set; }
    }
}
