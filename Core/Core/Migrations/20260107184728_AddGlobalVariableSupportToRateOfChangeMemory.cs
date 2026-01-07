using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class AddGlobalVariableSupportToRateOfChangeMemory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "alarm_output_reference",
                table: "rate_of_change_memory",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "alarm_output_type",
                table: "rate_of_change_memory",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "input_reference",
                table: "rate_of_change_memory",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "input_type",
                table: "rate_of_change_memory",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "output_reference",
                table: "rate_of_change_memory",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "output_type",
                table: "rate_of_change_memory",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "alarm_output_reference",
                table: "rate_of_change_memory");

            migrationBuilder.DropColumn(
                name: "alarm_output_type",
                table: "rate_of_change_memory");

            migrationBuilder.DropColumn(
                name: "input_reference",
                table: "rate_of_change_memory");

            migrationBuilder.DropColumn(
                name: "input_type",
                table: "rate_of_change_memory");

            migrationBuilder.DropColumn(
                name: "output_reference",
                table: "rate_of_change_memory");

            migrationBuilder.DropColumn(
                name: "output_type",
                table: "rate_of_change_memory");
        }
    }
}
