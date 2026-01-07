using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class AddComparisonMemoryGlobalVariableSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "output_type",
                table: "comparison_memory",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "output_reference",
                table: "comparison_memory",
                type: "text",
                nullable: false,
                defaultValue: "");

            // Migrate existing OutputItemId values to OutputReference
            migrationBuilder.Sql(@"
                UPDATE comparison_memory 
                SET output_reference = output_item_id::text 
                WHERE output_item_id IS NOT NULL AND output_item_id != '00000000-0000-0000-0000-000000000000'::uuid;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "output_reference",
                table: "comparison_memory");

            migrationBuilder.DropColumn(
                name: "output_type",
                table: "comparison_memory");
        }
    }
}
