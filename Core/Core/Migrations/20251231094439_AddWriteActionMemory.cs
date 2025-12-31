using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class AddWriteActionMemory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "write_action_memories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    name = table.Column<string>(type: "text", nullable: true),
                    input_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    output_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    output_value = table.Column<string>(type: "text", nullable: true),
                    output_value_source_item_id = table.Column<Guid>(type: "uuid", nullable: true),
                    interval = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    duration = table.Column<long>(type: "bigint", nullable: false, defaultValue: 10L),
                    max_execution_count = table.Column<int>(type: "integer", nullable: true),
                    current_execution_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    is_disabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_write_action_memories", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "write_action_memories");
        }
    }
}
