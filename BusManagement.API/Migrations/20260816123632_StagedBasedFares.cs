using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BusManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class StagedBasedFares : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Fares_Stops_FromStopId",
                table: "Fares");

            migrationBuilder.DropForeignKey(
                name: "FK_Fares_Stops_ToStopId",
                table: "Fares");

            migrationBuilder.DropIndex(
                name: "IX_Fares_BusType_FromStopId_ToStopId",
                table: "Fares");

            migrationBuilder.DropIndex(
                name: "IX_Fares_FromStopId",
                table: "Fares");

            migrationBuilder.DropIndex(
                name: "IX_Fares_ToStopId",
                table: "Fares");

            migrationBuilder.DropColumn(
                name: "EffectiveFrom",
                table: "Fares");

            migrationBuilder.DropColumn(
                name: "EffectiveTo",
                table: "Fares");

            migrationBuilder.DropColumn(
                name: "FromStopId",
                table: "Fares");

            migrationBuilder.RenameColumn(
                name: "ToStopId",
                table: "Fares",
                newName: "Stages");

            migrationBuilder.CreateIndex(
                name: "IX_Fares_BusType_Stages",
                table: "Fares",
                columns: new[] { "BusType", "Stages" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Fares_BusType_Stages",
                table: "Fares");

            migrationBuilder.RenameColumn(
                name: "Stages",
                table: "Fares",
                newName: "ToStopId");

            migrationBuilder.AddColumn<DateTime>(
                name: "EffectiveFrom",
                table: "Fares",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EffectiveTo",
                table: "Fares",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "FromStopId",
                table: "Fares",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Fares_BusType_FromStopId_ToStopId",
                table: "Fares",
                columns: new[] { "BusType", "FromStopId", "ToStopId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Fares_FromStopId",
                table: "Fares",
                column: "FromStopId");

            migrationBuilder.CreateIndex(
                name: "IX_Fares_ToStopId",
                table: "Fares",
                column: "ToStopId");

            migrationBuilder.AddForeignKey(
                name: "FK_Fares_Stops_FromStopId",
                table: "Fares",
                column: "FromStopId",
                principalTable: "Stops",
                principalColumn: "StopId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Fares_Stops_ToStopId",
                table: "Fares",
                column: "ToStopId",
                principalTable: "Stops",
                principalColumn: "StopId",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
