using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class db0061 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "holiday_calendar",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    name = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_holiday_calendar", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "holiday_date",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    holiday_calendar_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateTime>(type: "date", nullable: false),
                    name = table.Column<string>(type: "text", nullable: true),
                    holiday_analog_value = table.Column<double>(type: "double precision", nullable: true),
                    holiday_digital_value = table.Column<bool>(type: "boolean", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_holiday_date", x => x.id);
                    table.ForeignKey(
                        name: "FK_holiday_date_holiday_calendar_holiday_calendar_id",
                        column: x => x.holiday_calendar_id,
                        principalTable: "holiday_calendar",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "schedule_memory",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    name = table.Column<string>(type: "text", nullable: true),
                    output_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    interval = table.Column<int>(type: "integer", nullable: false, defaultValue: 10),
                    is_disabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    holiday_calendar_id = table.Column<Guid>(type: "uuid", nullable: true),
                    default_analog_value = table.Column<double>(type: "double precision", nullable: true),
                    default_digital_value = table.Column<bool>(type: "boolean", nullable: true),
                    manual_override_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    manual_override_analog_value = table.Column<double>(type: "double precision", nullable: true),
                    manual_override_digital_value = table.Column<bool>(type: "boolean", nullable: true),
                    override_expiration_mode = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    override_duration_minutes = table.Column<int>(type: "integer", nullable: false, defaultValue: 60),
                    override_activation_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_active_block_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_schedule_memory", x => x.id);
                    table.ForeignKey(
                        name: "FK_schedule_memory_holiday_calendar_holiday_calendar_id",
                        column: x => x.holiday_calendar_id,
                        principalTable: "holiday_calendar",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "schedule_block",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    schedule_memory_id = table.Column<Guid>(type: "uuid", nullable: false),
                    day_of_week = table.Column<int>(type: "integer", nullable: false),
                    start_time = table.Column<TimeSpan>(type: "interval", nullable: false),
                    end_time = table.Column<TimeSpan>(type: "interval", nullable: false),
                    priority = table.Column<int>(type: "integer", nullable: false, defaultValue: 2),
                    analog_output_value = table.Column<double>(type: "double precision", nullable: true),
                    digital_output_value = table.Column<bool>(type: "boolean", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_schedule_block", x => x.id);
                    table.ForeignKey(
                        name: "FK_schedule_block_schedule_memory_schedule_memory_id",
                        column: x => x.schedule_memory_id,
                        principalTable: "schedule_memory",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_holiday_date_holiday_calendar_id_date",
                table: "holiday_date",
                columns: new[] { "holiday_calendar_id", "date" });

            migrationBuilder.CreateIndex(
                name: "IX_schedule_block_schedule_memory_id_day_of_week_start_time",
                table: "schedule_block",
                columns: new[] { "schedule_memory_id", "day_of_week", "start_time" });

            migrationBuilder.CreateIndex(
                name: "IX_schedule_memory_holiday_calendar_id",
                table: "schedule_memory",
                column: "holiday_calendar_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "holiday_date");

            migrationBuilder.DropTable(
                name: "schedule_block");

            migrationBuilder.DropTable(
                name: "schedule_memory");

            migrationBuilder.DropTable(
                name: "holiday_calendar");
        }
    }
}
