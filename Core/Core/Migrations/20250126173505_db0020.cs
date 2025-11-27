using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class db0020 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<float>(
                name: "calibration_a",
                table: "items",
                type: "real",
                nullable: true,
                defaultValue: 1f);

            migrationBuilder.AddColumn<float>(
                name: "calibration_b",
                table: "items",
                type: "real",
                nullable: true,
                defaultValue: 0f);

            migrationBuilder.AddColumn<bool>(
                name: "is_calibration_enabled",
                table: "items",
                type: "boolean",
                nullable: true,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "calibration_a",
                table: "items");

            migrationBuilder.DropColumn(
                name: "calibration_b",
                table: "items");

            migrationBuilder.DropColumn(
                name: "is_calibration_enabled",
                table: "items");
        }
    }
}
