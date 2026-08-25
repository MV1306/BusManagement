namespace BusManagement.API.Models;

public class StageTranslation
{
    public int StageTranslationId { get; set; }
    public int RouteStageId { get; set; }
    public string LanguageCode { get; set; } = null!;
    public string TranslatedName { get; set; } = null!;

    public RouteStage RouteStage { get; set; } = null!;
}
