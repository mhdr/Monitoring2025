using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class AddDurationToMemories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "duration",
                table: "statistical_memory",
                type: "bigint",
                nullable: false,
                defaultValue: 10L);

            migrationBuilder.AddColumn<long>(
                name: "duration",
                table: "schedule_memory",
                type: "bigint",
                nullable: false,
                defaultValue: 10L);

            migrationBuilder.AddColumn<long>(
                name: "duration",
                table: "minmax_selector_memory",
                type: "bigint",
                nullable: false,
                defaultValue: 10L);

            migrationBuilder.AddColumn<long>(
                name: "duration",
                table: "comparison_memory",
                type: "bigint",
                nullable: false,
                defaultValue: 10L);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "duration",
                table: "statistical_memory");

            migrationBuilder.DropColumn(
                name: "duration",
                table: "schedule_memory");

            migrationBuilder.DropColumn(
                name: "duration",
                table: "minmax_selector_memory");

            migrationBuilder.DropColumn(
                name: "duration",
                table: "comparison_memory");
        }
    }
}
