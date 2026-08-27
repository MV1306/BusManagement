namespace BusManagement.API.Services;

public interface ITranslationProvider
{
    /// <summary>Translates a single phrase to the target language code (e.g. "ta").</summary>
    Task<string> TranslateAsync(string text, string targetLanguage, CancellationToken ct = default);
}
