using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class db0048 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "connection_type",
                table: "controller_modbus",
                type: "integer",
                nullable: true,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "modbus_type",
                table: "controller_modbus",
                type: "integer",
                nullable: true,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "connection_type",
                table: "controller_modbus");

            migrationBuilder.DropColumn(
                name: "modbus_type",
                table: "controller_modbus");
        }
    }
}
