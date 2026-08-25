using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BusManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class RemoveBusTypeFromRoute : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BusType",
                table: "Routes");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BusType",
                table: "Routes",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");
        }
    }
}
