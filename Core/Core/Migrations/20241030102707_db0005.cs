using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class db0005 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "controllers");

            migrationBuilder.CreateTable(
                name: "controller_sharp7",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    name = table.Column<string>(type: "text", nullable: false),
                    ip_address = table.Column<string>(type: "text", nullable: false),
                    db_address = table.Column<int>(type: "integer", nullable: false),
                    db_start_data = table.Column<int>(type: "integer", nullable: false),
                    db_size_data = table.Column<int>(type: "integer", nullable: false),
                    data_type = table.Column<int>(type: "integer", nullable: false),
                    username = table.Column<string>(type: "text", nullable: true),
                    encrypted_password = table.Column<byte[]>(type: "bytea", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_controller_sharp7", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "controller_sharp7");

            migrationBuilder.CreateTable(
                name: "controllers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    db_address = table.Column<int>(type: "integer", nullable: false),
                    db_size_data = table.Column<int>(type: "integer", nullable: false),
                    db_start_data = table.Column<int>(type: "integer", nullable: false),
                    encrypted_password = table.Column<byte[]>(type: "bytea", nullable: true),
                    ip_address = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    type = table.Column<int>(type: "integer", nullable: false),
                    username = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_controllers", x => x.id);
                });
        }
    }
}
