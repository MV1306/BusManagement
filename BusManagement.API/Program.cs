using System.Text;
using BusManagement.API.Data;
using BusManagement.API.Models;
using BusManagement.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using Serilog;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, cfg) => cfg.ReadFrom.Configuration(ctx.Configuration));

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(
    options =>
        options.AddPolicy(
            "AllowUI",
            policy => policy
                .WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod()
        )
);

builder.Services.AddMemoryCache();

builder.Services.AddHttpClient("MtcScraper", client =>
{
    client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0");
    client.Timeout = TimeSpan.FromSeconds(20);
});

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
builder.Services.AddScoped<JourneyPlannerService>();
builder.Services.AddHttpClient<GeocodingService>(client =>
{
    client.DefaultRequestHeaders.UserAgent.ParseAdd("BusManagement/1.0");
});
builder.Services.AddSingleton<TamilTransliterationService>();

// Register translation provider based on config
var translationProvider = builder.Configuration["Translation:Provider"] ?? "Fallback";
switch (translationProvider.ToLowerInvariant())
{
    case "libretranslate":
        builder.Services.AddHttpClient<ITranslationProvider, LibreTranslateProvider>(client =>
        {
            var url =
                builder.Configuration["Translation:LibreTranslate:Url"] ?? "http://localhost:5000";
            client.BaseAddress = new Uri(url);
        });
        break;
    case "google":
        builder.Services.AddHttpClient<ITranslationProvider, GoogleTranslateProvider>();
        break;
    case "indictrans2":
        builder.Services.AddHttpClient<ITranslationProvider, IndicTranslateProvider>(client =>
        {
            var url = builder.Configuration["Translation:IndicTrans2:Url"] ?? "http://localhost:5100";
            client.BaseAddress = new Uri(url);
        });
        break;
    default:
        builder.Services.AddSingleton<ITranslationProvider, FallbackTransliterationProvider>();
        break;
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        var key = builder.Configuration["Jwt:Key"]!;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
        };
    });
builder.Services.AddAuthorization();

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

app.UseSerilogRequestLogging();
app.UseHttpsRedirection();
app.UseCors("AllowUI");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Auto-migrate on startup (controlled by config)
if (app.Configuration.GetValue<bool>("AutoMigrateOnStartup"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<BusManagementDbContext>();
    db.Database.Migrate();

    // Seed admin if not exists
    if (!db.AppUsers.Any(u => u.Role == "Admin"))
    {
        var adminUser = new AppUser
        {
            Username = app.Configuration["Admin:Username"] ?? "admin",
            Role = "Admin",
        };
        adminUser.PasswordHash = new PasswordHasher<AppUser>().HashPassword(adminUser,
            app.Configuration["Admin:Password"] ?? "Admin@123");
        db.AppUsers.Add(adminUser);
        db.SaveChanges();
    }
}

app.Run();
