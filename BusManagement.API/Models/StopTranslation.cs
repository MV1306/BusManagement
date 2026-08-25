namespace BusManagement.API.Models;

public class StopTranslation
{
    public int StopTranslationId { get; set; }
    public int StopId { get; set; }
    public string LanguageCode { get; set; } = null!;
    public string TranslatedName { get; set; } = null!;
    public string? TranslatedShortName { get; set; }

    public Stop Stop { get; set; } = null!;
}
