using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class RemoveScheduleMemoryDefaultValues : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "default_analog_value",
                table: "schedule_memory");

            migrationBuilder.DropColumn(
                name: "default_digital_value",
                table: "schedule_memory");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "default_analog_value",
                table: "schedule_memory",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "default_digital_value",
                table: "schedule_memory",
                type: "boolean",
                nullable: true);
        }
    }
}
