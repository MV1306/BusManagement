namespace BusManagement.API.Services;

/// <summary>
/// Fallback provider that wraps the in-house TamilTransliterationService.
/// Used when no external translation provider is configured.
/// </summary>
public class FallbackTransliterationProvider(TamilTransliterationService transliterator) : ITranslationProvider
{
    public Task<string> TranslateAsync(string text, string targetLanguage, CancellationToken ct = default)
        => Task.FromResult(transliterator.TransliteratePhrase(text));
}
