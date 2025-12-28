using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class AddPIDAutoTuning : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "pid_tuning_session",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    pid_memory_id = table.Column<Guid>(type: "uuid", nullable: false),
                    start_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    end_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false),
                    error_message = table.Column<string>(type: "text", nullable: true),
                    relay_amplitude = table.Column<double>(type: "double precision", nullable: false),
                    relay_hysteresis = table.Column<double>(type: "double precision", nullable: false),
                    min_cycles = table.Column<int>(type: "integer", nullable: false),
                    max_cycles = table.Column<int>(type: "integer", nullable: false),
                    max_amplitude = table.Column<double>(type: "double precision", nullable: false),
                    timeout = table.Column<int>(type: "integer", nullable: false),
                    ultimate_period = table.Column<double>(type: "double precision", nullable: true),
                    oscillation_amplitude = table.Column<double>(type: "double precision", nullable: true),
                    critical_gain = table.Column<double>(type: "double precision", nullable: true),
                    calculated_kp = table.Column<double>(type: "double precision", nullable: true),
                    calculated_ki = table.Column<double>(type: "double precision", nullable: true),
                    calculated_kd = table.Column<double>(type: "double precision", nullable: true),
                    original_kp = table.Column<double>(type: "double precision", nullable: false),
                    original_ki = table.Column<double>(type: "double precision", nullable: false),
                    original_kd = table.Column<double>(type: "double precision", nullable: false),
                    confidence_score = table.Column<double>(type: "double precision", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pid_tuning_session", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "pid_tuning_session");
        }
    }
}
