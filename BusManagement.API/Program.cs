using BusManagement.API.Data;
using BusManagement.API.Services;
using Microsoft.EntityFrameworkCore;
using Npgsql;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(
    options =>
        options.AddPolicy(
            "AllowUI",
            policy =>
                policy
                    .WithOrigins("http://localhost:5173")
                    .WithOrigins("http://localhost:5174")
                    .WithOrigins("http://192.168.29.141:100")
                    .WithOrigins("http://192.168.29.141:1306")
                    .WithOrigins("https://192.168.29.141:1306")
                    .AllowAnyHeader()
                    .AllowAnyMethod()
        )
);

builder.Services.AddDbContext<BusManagementDbContext>(
    options => options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
);

builder.Services.AddScoped<StopService>();
builder.Services.AddScoped<RouteService>();
builder.Services.AddScoped<RouteStageService>();
builder.Services.AddScoped<RouteStopService>();
builder.Services.AddScoped<RouteSearchService>();
builder.Services.AddScoped<SmartRouteService>();
builder.Services.AddScoped<FareService>();
builder.Services.AddScoped<FareCalculationService>();
builder.Services.AddScoped<ImportService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<GtfsExportService>();

builder.Services
    .AddControllers()
    .AddJsonOptions(
        o =>
            o.JsonSerializerOptions.Converters.Add(
                new System.Text.Json.Serialization.JsonStringEnumConverter()
            )
    );
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o => o.UseInlineDefinitionsForEnums());

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseCors("AllowUI");
app.MapControllers();

// Auto-migrate on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<BusManagementDbContext>();
    db.Database.Migrate();
}

app.Run();
