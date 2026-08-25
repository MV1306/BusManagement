namespace BusManagement.API.DTOs.ImportDTOs;

public record ImportResult(int Imported, int Skipped, int Failed, List<ImportError> Errors);

public record ImportError(int Row, string Reason);
