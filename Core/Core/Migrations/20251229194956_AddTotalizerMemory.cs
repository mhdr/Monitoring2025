using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class AddTotalizerMemory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "totalizer_memory",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    name = table.Column<string>(type: "text", nullable: true),
                    input_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    output_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    interval = table.Column<int>(type: "integer", nullable: false, defaultValue: 10),
                    is_disabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    accumulation_type = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    reset_on_overflow = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    overflow_threshold = table.Column<double>(type: "double precision", nullable: true),
                    manual_reset_enabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    scheduled_reset_enabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    reset_cron = table.Column<string>(type: "text", nullable: true),
                    last_reset_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    accumulated_value = table.Column<double>(type: "double precision", nullable: false, defaultValue: 0.0),
                    last_input_value = table.Column<double>(type: "double precision", nullable: true),
                    last_event_state = table.Column<bool>(type: "boolean", nullable: true),
                    units = table.Column<string>(type: "text", nullable: true),
                    decimal_places = table.Column<int>(type: "integer", nullable: false, defaultValue: 2)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_totalizer_memory", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "totalizer_memory");
        }
    }
}
