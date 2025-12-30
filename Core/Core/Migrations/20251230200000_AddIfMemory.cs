using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class AddIfMemory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "if_memory",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    name = table.Column<string>(type: "text", nullable: true),
                    branches = table.Column<string>(type: "text", nullable: false, defaultValue: "[]"),
                    default_value = table.Column<double>(type: "double precision", nullable: false, defaultValue: 0),
                    variable_aliases = table.Column<string>(type: "text", nullable: false, defaultValue: "{}"),
                    output_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    output_type = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    interval = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    is_disabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_if_memory", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "if_memory");
        }
    }
}
