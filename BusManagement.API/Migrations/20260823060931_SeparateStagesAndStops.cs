using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BusManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class SeparateStagesAndStops : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DistanceFromPreviousKm",
                table: "RouteStops");

            migrationBuilder.AddColumn<int>(
                name: "RouteStageId",
                table: "RouteStops",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Clear existing RouteStops — they have RouteStageId=0 which violates the FK
            migrationBuilder.Sql("DELETE FROM \"RouteStops\";");

            migrationBuilder.CreateTable(
                name: "RouteStages",
                columns: table => new
                {
                    RouteStageId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RouteId = table.Column<int>(type: "integer", nullable: false),
                    StageName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    StageOrder = table.Column<int>(type: "integer", nullable: false),
                    DistanceFromPreviousKm = table.Column<double>(type: "double precision", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RouteStages", x => x.RouteStageId);
                    table.ForeignKey(
                        name: "FK_RouteStages_Routes_RouteId",
                        column: x => x.RouteId,
                        principalTable: "Routes",
                        principalColumn: "RouteId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RouteStops_RouteStageId",
                table: "RouteStops",
                column: "RouteStageId");

            migrationBuilder.CreateIndex(
                name: "IX_RouteStages_RouteId_StageOrder",
                table: "RouteStages",
                columns: new[] { "RouteId", "StageOrder" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_RouteStops_RouteStages_RouteStageId",
                table: "RouteStops",
                column: "RouteStageId",
                principalTable: "RouteStages",
                principalColumn: "RouteStageId",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RouteStops_RouteStages_RouteStageId",
                table: "RouteStops");

            migrationBuilder.DropTable(
                name: "RouteStages");

            migrationBuilder.DropIndex(
                name: "IX_RouteStops_RouteStageId",
                table: "RouteStops");

            migrationBuilder.DropColumn(
                name: "RouteStageId",
                table: "RouteStops");

            migrationBuilder.AddColumn<double>(
                name: "DistanceFromPreviousKm",
                table: "RouteStops",
                type: "double precision",
                nullable: true);
        }
    }
}
