using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DB.User.Migrations
{
    /// <inheritdoc />
    public partial class RemoveGroupPermission : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "group_permissions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "group_permissions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    group_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_group_permissions", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_group_permissions_group_id",
                table: "group_permissions",
                column: "group_id");

            migrationBuilder.CreateIndex(
                name: "IX_group_permissions_user_id",
                table: "group_permissions",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_group_permissions_user_id_group_id",
                table: "group_permissions",
                columns: new[] { "user_id", "group_id" });
        }
    }
}
