using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class AddAverageMemoryGlobalVariableSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "output_item_id",
                table: "average_memory",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<string>(
                name: "output_reference",
                table: "average_memory",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "output_type",
                table: "average_memory",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // ========== DATA MIGRATION ==========
            // Migrate existing data to new format with prefixes
            
            // Step 1: Set OutputReference and OutputType from OutputItemId for existing records
            migrationBuilder.Sql(@"
                UPDATE average_memory 
                SET output_reference = 'P:' || output_item_id::text,
                    output_type = 0
                WHERE output_item_id IS NOT NULL;
            ");

            // Step 2: Update InputItemIds to add 'P:' prefix to all existing GUIDs
            // PostgreSQL: Parse JSON array, add prefix to each element, re-serialize
            migrationBuilder.Sql(@"
                UPDATE average_memory
                SET input_item_ids = (
                    SELECT jsonb_agg('P:' || elem::text)
                    FROM jsonb_array_elements_text(input_item_ids::jsonb) AS elem
                )::text
                WHERE input_item_ids IS NOT NULL 
                  AND input_item_ids != '[]'
                  AND NOT input_item_ids::text LIKE '%P:%';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "output_reference",
                table: "average_memory");

            migrationBuilder.DropColumn(
                name: "output_type",
                table: "average_memory");

            migrationBuilder.AlterColumn<Guid>(
                name: "output_item_id",
                table: "average_memory",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
