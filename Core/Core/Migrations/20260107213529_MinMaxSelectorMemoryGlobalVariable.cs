using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class MinMaxSelectorMemoryGlobalVariable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "output_reference",
                table: "minmax_selector_memory",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "output_type",
                table: "minmax_selector_memory",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "selected_index_output_reference",
                table: "minmax_selector_memory",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "selected_index_output_type",
                table: "minmax_selector_memory",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "output_reference",
                table: "minmax_selector_memory");

            migrationBuilder.DropColumn(
                name: "output_type",
                table: "minmax_selector_memory");

            migrationBuilder.DropColumn(
                name: "selected_index_output_reference",
                table: "minmax_selector_memory");

            migrationBuilder.DropColumn(
                name: "selected_index_output_type",
                table: "minmax_selector_memory");
        }
    }
}
