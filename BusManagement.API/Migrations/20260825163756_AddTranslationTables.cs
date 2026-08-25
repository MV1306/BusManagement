using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BusManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTranslationTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StageTranslations",
                columns: table => new
                {
                    StageTranslationId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RouteStageId = table.Column<int>(type: "integer", nullable: false),
                    LanguageCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    TranslatedName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StageTranslations", x => x.StageTranslationId);
                    table.ForeignKey(
                        name: "FK_StageTranslations_RouteStages_RouteStageId",
                        column: x => x.RouteStageId,
                        principalTable: "RouteStages",
                        principalColumn: "RouteStageId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StopTranslations",
                columns: table => new
                {
                    StopTranslationId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    StopId = table.Column<int>(type: "integer", nullable: false),
                    LanguageCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    TranslatedName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TranslatedShortName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StopTranslations", x => x.StopTranslationId);
                    table.ForeignKey(
                        name: "FK_StopTranslations_Stops_StopId",
                        column: x => x.StopId,
                        principalTable: "Stops",
                        principalColumn: "StopId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StageTranslations_RouteStageId_LanguageCode",
                table: "StageTranslations",
                columns: new[] { "RouteStageId", "LanguageCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StopTranslations_StopId_LanguageCode",
                table: "StopTranslations",
                columns: new[] { "StopId", "LanguageCode" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StageTranslations");

            migrationBuilder.DropTable(
                name: "StopTranslations");
        }
    }
}
