using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class db0021 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "pid_memory",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    input_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    output_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kp = table.Column<double>(type: "double precision", nullable: false, defaultValue: 1.0),
                    ki = table.Column<double>(type: "double precision", nullable: false, defaultValue: 0.10000000000000001),
                    kd = table.Column<double>(type: "double precision", nullable: false, defaultValue: 0.050000000000000003),
                    output_min = table.Column<double>(type: "double precision", nullable: false, defaultValue: 0.0),
                    output_max = table.Column<double>(type: "double precision", nullable: false, defaultValue: 100.0),
                    interval = table.Column<int>(type: "integer", nullable: false, defaultValue: 10),
                    is_disabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    Setpoint = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pid_memory", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "pid_memory");
        }
    }
}
