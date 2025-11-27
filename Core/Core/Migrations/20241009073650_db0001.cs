using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class db0001 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "active_alarms",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    alarm_id = table.Column<Guid>(type: "uuid", nullable: false),
                    time = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_active_alarms", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "alarm_actions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    alarm_id = table.Column<Guid>(type: "uuid", nullable: false),
                    action_type = table.Column<int>(type: "integer", nullable: false),
                    trigger_on = table.Column<bool>(type: "boolean", nullable: false),
                    controller_id = table.Column<Guid>(type: "uuid", nullable: true),
                    memory_address = table.Column<string>(type: "text", nullable: true),
                    controller_value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_alarm_actions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "alarm_history",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    time = table.Column<long>(type: "bigint", nullable: false),
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    alarm_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    alarm_log = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_alarm_history", x => new { x.id, x.time });
                });

            migrationBuilder.CreateTable(
                name: "alarms",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    alarm_type = table.Column<int>(type: "integer", nullable: false),
                    alarm_priority = table.Column<int>(type: "integer", nullable: false),
                    compare_type = table.Column<int>(type: "integer", nullable: false),
                    is_disabled = table.Column<bool>(type: "boolean", nullable: false),
                    alarm_delay = table.Column<int>(type: "integer", nullable: false),
                    message = table.Column<string>(type: "text", nullable: true),
                    value1 = table.Column<string>(type: "text", nullable: true),
                    value2 = table.Column<string>(type: "text", nullable: true),
                    timeout = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_alarms", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "controllers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    name = table.Column<string>(type: "text", nullable: false),
                    type = table.Column<int>(type: "integer", nullable: false),
                    address = table.Column<string>(type: "text", nullable: false),
                    location = table.Column<string>(type: "text", nullable: false),
                    username = table.Column<string>(type: "text", nullable: true),
                    encrypted_password = table.Column<byte[]>(type: "bytea", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_controllers", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "dictionary",
                columns: table => new
                {
                    key = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dictionary", x => x.key);
                });

            migrationBuilder.CreateTable(
                name: "final_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    value = table.Column<string>(type: "text", nullable: false),
                    time = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_final_items", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    controller_id = table.Column<Guid>(type: "uuid", nullable: false),
                    item_type = table.Column<int>(type: "integer", nullable: false),
                    item_name = table.Column<string>(type: "text", nullable: true),
                    point_number = table.Column<int>(type: "integer", nullable: false),
                    should_scale = table.Column<int>(type: "integer", nullable: false),
                    norm_min = table.Column<float>(type: "real", nullable: false),
                    norm_max = table.Column<float>(type: "real", nullable: false),
                    scale_min = table.Column<float>(type: "real", nullable: false),
                    scale_max = table.Column<float>(type: "real", nullable: false),
                    save_interval = table.Column<int>(type: "integer", nullable: false),
                    save_historical_interval = table.Column<int>(type: "integer", nullable: false),
                    calculation_method = table.Column<int>(type: "integer", nullable: false),
                    number_of_samples = table.Column<int>(type: "integer", nullable: false),
                    save_on_change = table.Column<int>(type: "integer", nullable: false),
                    save_on_change_range = table.Column<float>(type: "real", nullable: false),
                    on_text = table.Column<string>(type: "text", nullable: true),
                    off_text = table.Column<string>(type: "text", nullable: true),
                    unit = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_items", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "items_history",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    time = table.Column<long>(type: "bigint", nullable: false),
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    value = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_items_history", x => new { x.id, x.time });
                });

            migrationBuilder.CreateTable(
                name: "raw_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    value = table.Column<string>(type: "text", nullable: false),
                    time = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_raw_items", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_active_alarms_alarm_id",
                table: "active_alarms",
                column: "alarm_id");

            migrationBuilder.CreateIndex(
                name: "IX_active_alarms_item_id",
                table: "active_alarms",
                column: "item_id");

            migrationBuilder.CreateIndex(
                name: "IX_active_alarms_item_id_alarm_id",
                table: "active_alarms",
                columns: new[] { "item_id", "alarm_id" });

            migrationBuilder.CreateIndex(
                name: "IX_alarm_history_alarm_id",
                table: "alarm_history",
                column: "alarm_id");

            migrationBuilder.CreateIndex(
                name: "IX_alarm_history_item_id",
                table: "alarm_history",
                column: "item_id");

            migrationBuilder.CreateIndex(
                name: "IX_alarm_history_item_id_time",
                table: "alarm_history",
                columns: new[] { "item_id", "time" });

            migrationBuilder.CreateIndex(
                name: "IX_alarm_history_time",
                table: "alarm_history",
                column: "time");

            migrationBuilder.CreateIndex(
                name: "IX_final_items_item_id",
                table: "final_items",
                column: "item_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_items_history_item_id",
                table: "items_history",
                column: "item_id");

            migrationBuilder.CreateIndex(
                name: "IX_items_history_item_id_time",
                table: "items_history",
                columns: new[] { "item_id", "time" });

            migrationBuilder.CreateIndex(
                name: "IX_items_history_time",
                table: "items_history",
                column: "time");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "active_alarms");

            migrationBuilder.DropTable(
                name: "alarm_actions");

            migrationBuilder.DropTable(
                name: "alarm_history");

            migrationBuilder.DropTable(
                name: "alarms");

            migrationBuilder.DropTable(
                name: "controllers");

            migrationBuilder.DropTable(
                name: "dictionary");

            migrationBuilder.DropTable(
                name: "final_items");

            migrationBuilder.DropTable(
                name: "items");

            migrationBuilder.DropTable(
                name: "items_history");

            migrationBuilder.DropTable(
                name: "raw_items");
        }
    }
}
