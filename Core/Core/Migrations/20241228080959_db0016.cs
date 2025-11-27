using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Core.Migrations
{
    /// <inheritdoc />
    public partial class db0016 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Position",
                table: "map_sharp7",
                newName: "position");

            migrationBuilder.RenameColumn(
                name: "Bit",
                table: "map_sharp7",
                newName: "bit");

            migrationBuilder.RenameColumn(
                name: "OperationType",
                table: "map_sharp7",
                newName: "io_operation_type");

            migrationBuilder.RenameColumn(
                name: "ItemId",
                table: "map_sharp7",
                newName: "item_id");

            migrationBuilder.RenameColumn(
                name: "ControllerId",
                table: "map_sharp7",
                newName: "controller_id");

            migrationBuilder.CreateTable(
                name: "controller_bacnet",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    name = table.Column<string>(type: "text", nullable: false),
                    device_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_controller_bacnet", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "map_bacnet",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    controller_id = table.Column<Guid>(type: "uuid", nullable: false),
                    object_id = table.Column<int>(type: "integer", nullable: false),
                    object_type = table.Column<int>(type: "integer", nullable: false),
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    io_operation_type = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_map_bacnet", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "controller_bacnet");

            migrationBuilder.DropTable(
                name: "map_bacnet");

            migrationBuilder.RenameColumn(
                name: "position",
                table: "map_sharp7",
                newName: "Position");

            migrationBuilder.RenameColumn(
                name: "bit",
                table: "map_sharp7",
                newName: "Bit");

            migrationBuilder.RenameColumn(
                name: "item_id",
                table: "map_sharp7",
                newName: "ItemId");

            migrationBuilder.RenameColumn(
                name: "io_operation_type",
                table: "map_sharp7",
                newName: "OperationType");

            migrationBuilder.RenameColumn(
                name: "controller_id",
                table: "map_sharp7",
                newName: "ControllerId");
        }
    }
}
