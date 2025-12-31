using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class AddMinMaxSelectorMemory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "minmax_selector_memory",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    name = table.Column<string>(type: "text", nullable: true),
                    input_item_ids = table.Column<string>(type: "jsonb", nullable: false, defaultValue: "[]"),
                    output_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    selected_index_output_item_id = table.Column<Guid>(type: "uuid", nullable: true),
                    selection_mode = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    failover_mode = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    interval = table.Column<int>(type: "integer", nullable: false, defaultValue: 10),
                    is_disabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    last_selected_index = table.Column<int>(type: "integer", nullable: true),
                    last_selected_value = table.Column<double>(type: "double precision", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_minmax_selector_memory", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "minmax_selector_memory");
        }
    }
}
