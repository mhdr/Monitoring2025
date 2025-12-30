using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class AddRateOfChangeMemory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "rate_of_change_memory",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    name = table.Column<string>(type: "text", nullable: true),
                    input_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    output_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    alarm_output_item_id = table.Column<Guid>(type: "uuid", nullable: true),
                    interval = table.Column<int>(type: "integer", nullable: false, defaultValue: 10),
                    is_disabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    calculation_method = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    time_window_seconds = table.Column<int>(type: "integer", nullable: false, defaultValue: 60),
                    smoothing_filter_alpha = table.Column<double>(type: "double precision", nullable: false, defaultValue: 0.20000000000000001),
                    high_rate_threshold = table.Column<double>(type: "double precision", nullable: true),
                    low_rate_threshold = table.Column<double>(type: "double precision", nullable: true),
                    high_rate_hysteresis = table.Column<double>(type: "double precision", nullable: false, defaultValue: 0.90000000000000002),
                    low_rate_hysteresis = table.Column<double>(type: "double precision", nullable: false, defaultValue: 0.90000000000000002),
                    alarm_state = table.Column<bool>(type: "boolean", nullable: true),
                    baseline_sample_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 3),
                    accumulated_samples = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    time_unit = table.Column<int>(type: "integer", nullable: false, defaultValue: 60),
                    rate_unit_display = table.Column<string>(type: "text", nullable: true),
                    decimal_places = table.Column<int>(type: "integer", nullable: false, defaultValue: 2),
                    last_smoothed_rate = table.Column<double>(type: "double precision", nullable: true),
                    last_input_value = table.Column<double>(type: "double precision", nullable: true),
                    last_timestamp = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rate_of_change_memory", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "rate_of_change_sample",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    rate_of_change_memory_id = table.Column<Guid>(type: "uuid", nullable: false),
                    timestamp = table.Column<long>(type: "bigint", nullable: false),
                    value = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rate_of_change_sample", x => x.id);
                    table.ForeignKey(
                        name: "FK_rate_of_change_sample_rate_of_change_memory_rate_of_change_~",
                        column: x => x.rate_of_change_memory_id,
                        principalTable: "rate_of_change_memory",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_rate_of_change_sample_rate_of_change_memory_id_timestamp",
                table: "rate_of_change_sample",
                columns: new[] { "rate_of_change_memory_id", "timestamp" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "rate_of_change_sample");

            migrationBuilder.DropTable(
                name: "rate_of_change_memory");
        }
    }
}
