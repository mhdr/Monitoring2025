using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class db0012 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "alarm_actions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "alarm_actions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    action_type = table.Column<int>(type: "integer", nullable: false),
                    alarm_id = table.Column<Guid>(type: "uuid", nullable: false),
                    controller_id = table.Column<Guid>(type: "uuid", nullable: true),
                    controller_value = table.Column<string>(type: "text", nullable: true),
                    memory_address = table.Column<string>(type: "text", nullable: true),
                    trigger_on = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_alarm_actions", x => x.id);
                });
        }
    }
}
