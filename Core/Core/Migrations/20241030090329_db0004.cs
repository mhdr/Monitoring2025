using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class db0004 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "location",
                table: "controllers");

            migrationBuilder.RenameColumn(
                name: "address",
                table: "controllers",
                newName: "ip_address");

            migrationBuilder.AddColumn<int>(
                name: "db_address",
                table: "controllers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "db_size_data",
                table: "controllers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "db_start_data",
                table: "controllers",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "db_address",
                table: "controllers");

            migrationBuilder.DropColumn(
                name: "db_size_data",
                table: "controllers");

            migrationBuilder.DropColumn(
                name: "db_start_data",
                table: "controllers");

            migrationBuilder.RenameColumn(
                name: "ip_address",
                table: "controllers",
                newName: "address");

            migrationBuilder.AddColumn<string>(
                name: "location",
                table: "controllers",
                type: "text",
                nullable: true);
        }
    }
}
