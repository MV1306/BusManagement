using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BusManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDistanceToRouteStop : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "DistanceFromPreviousKm",
                table: "RouteStops",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DistanceFromPreviousKm",
                table: "RouteStops");
        }
    }
}
