using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class AddDeadbandMemory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "deadband_memory",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    name = table.Column<string>(type: "text", nullable: true),
                    input_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    output_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    interval = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    is_disabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    deadband = table.Column<double>(type: "double precision", nullable: false, defaultValue: 0.0),
                    deadband_type = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    input_min = table.Column<double>(type: "double precision", nullable: false, defaultValue: 0.0),
                    input_max = table.Column<double>(type: "double precision", nullable: false, defaultValue: 100.0),
                    stability_time = table.Column<double>(type: "double precision", nullable: false, defaultValue: 1.0),
                    last_output_value = table.Column<double>(type: "double precision", nullable: true),
                    last_input_value = table.Column<double>(type: "double precision", nullable: true),
                    last_change_time = table.Column<long>(type: "bigint", nullable: true),
                    pending_digital_state = table.Column<bool>(type: "boolean", nullable: true),
                    last_timestamp = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_deadband_memory", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "deadband_memory");
        }
    }
}
